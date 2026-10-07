/*
 * 域名连通性拨测上报
 * 进入页面 3/10/15 分钟分别执行一次：
 *   1. GET  /api/domain-groups/{hashid}  取要拨测的域名列表
 *   2. 对每个域名做 HTTP 拨测，测可达性与延迟
 *   3. POST /api/external/domain-connectivity  上报结果
 *
 * 设计原则：
 *   - 不阻塞、不影响宿主页面：全部包裹在 IIFE + try/catch，所有 Promise 都 .catch
 *   - 失败仅在控制台 warn，不抛出
 *   - 走 same-origin 接口，拨测请求用 no-cors，避免被 CORS 拦
 *
 * 配置注入：模板里通过 window.__DOMAIN_PROBE_CONFIG__ = { hashid: '...', province: '...' } 传入
 */
(function () {
    'use strict';

    var TAG = '[domain-probe]';
    function log(method) {
        try {
            if (window.console && console[method]) {
                var args = Array.prototype.slice.call(arguments, 1);
                args.unshift(TAG);
                console[method].apply(console, args);
            }
        } catch (e) {}
    }
    function warn() { log.apply(null, ['warn'].concat(Array.prototype.slice.call(arguments))); }
    function info() { log.apply(null, ['log'].concat(Array.prototype.slice.call(arguments))); }

    try {
        if (!window.fetch || !window.Promise) {
            warn('runtime 不支持 fetch/Promise，跳过');
            return;
        }

        var cfg = window.__DOMAIN_PROBE_CONFIG__ || {};
        var hashid = cfg.hashid || '';
        if (!hashid) {
            warn('未配置 hashid，跳过');
            return;
        }

        var ORIGIN      = location.protocol + '//' + location.host;
        var GROUP_URL   = ORIGIN + '/api/domain-groups/' + encodeURIComponent(hashid);
        var REPORT_URL  = ORIGIN + '/api/external/domain-connectivity';
        var PROBE_TIMEOUT_MS = 5000;
        var SCHEDULES_MIN = [3, 10, 15];

        function now() {
            return (window.performance && performance.now) ? performance.now() : Date.now();
        }

        // 把任意形态的 domain 字符串规整为 https://{host}/domain-ping.txt
        // 输入示例: 'https://x.cc/index.php' / 'https://x.cc' / 'x.cc'
        function buildProbeUrl(raw) {
            try {
                var s = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
                var u = new URL(s);
                return u.protocol + '//' + u.host + '/domain-ping.txt';
            } catch (e) {
                return null;
            }
        }

        // 拨测预期 body：必须严格匹配 nginx 配置 `return 200 "domain-ping";` 的响应体
        // 仅靠状态码不够——CDN/SPA fallback/catch-all 都可能返回 200+CORS 但非目标端点
        var EXPECTED_BODY = 'domain-ping';

        // 拨测单个域名：命中目标站 nginx 的 /domain-ping.txt 端点
        // reachable 同时要求：CORS 通过 + HTTP 2xx + body 含 "domain-ping"
        function probe(domain) {
            return new Promise(function (resolve) {
                var raw = String(domain || '').trim();
                var url = raw ? buildProbeUrl(raw) : null;
                if (!url) {
                    resolve({ domain: domain, reachable: false, latencyMs: 0 });
                    return;
                }

                var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
                var done = false;
                var start = now();

                function finish(reachable, latencyMs) {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    resolve({ domain: domain, reachable: reachable, latencyMs: reachable ? latencyMs : 0 });
                }

                var timer = setTimeout(function () {
                    if (done) return;
                    if (ctrl) { try { ctrl.abort(); } catch (e) {} }
                    warn('拨测超时:', domain);
                    finish(false, 0);
                }, PROBE_TIMEOUT_MS);

                var opts = {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-store',
                    credentials: 'omit',
                    redirect: 'follow'
                };
                if (ctrl) opts.signal = ctrl.signal;

                fetch(url, opts).then(function (resp) {
                    if (done) return;
                    if (!resp || !resp.ok) {
                        warn('拨测非 2xx:', domain, 'status=' + (resp ? resp.status : 'n/a'));
                        return finish(false, 0);
                    }
                    return resp.text().then(function (body) {
                        var latency = Math.round(now() - start);
                        var ok = typeof body === 'string' && body.includes(EXPECTED_BODY);
                        if (!ok) {
                            warn('拨测 body 不符:', domain, '前60字节=', (body || '').slice(0, 60));
                        }
                        finish(ok, latency);
                    }, function (err) {
                        warn('读取拨测响应失败:', domain, err && err.message ? err.message : err);
                        finish(false, 0);
                    });
                }).catch(function (err) {
                    if (done) return;
                    warn('拨测失败:', domain, err && err.message ? err.message : err);
                    finish(false, 0);
                });
            });
        }

        function asDomain(x) {
            if (!x) return null;
            if (typeof x === 'string') return x;
            return x.domain || x.url || x.host || null;
        }
        function pickDomains(payload) {
            if (!payload) return [];
            if (Array.isArray(payload))                return payload.map(asDomain).filter(Boolean);
            if (Array.isArray(payload.items))          return payload.items.map(asDomain).filter(Boolean);
            if (Array.isArray(payload.domains))        return payload.domains.map(asDomain).filter(Boolean);
            if (payload.data)                          return pickDomains(payload.data);
            return [];
        }
        // 省份取自 GET 响应：data.requester.province（如 "广东"/"香港"）
        // 由 domain-groups 接口基于请求方 IP 解析，前端不做二次判断
        function pickProvince(payload) {
            if (!payload) return '';
            if (payload.data && payload.data.requester && payload.data.requester.province) {
                return String(payload.data.requester.province);
            }
            // 兼容其他常见位置，便于接口形态调整时不挂
            if (payload.requester && payload.requester.province) return String(payload.requester.province);
            if (payload.province) return String(payload.province);
            if (payload.data && payload.data.province) return String(payload.data.province);
            return '';
        }

        function runOnce() {
            fetch(GROUP_URL, { method: 'GET', cache: 'no-store', credentials: 'same-origin' })
                .then(function (r) {
                    if (!r) {
                        warn('拉取域名组无响应');
                        return null;
                    }
                    if (!r.ok) {
                        warn('拉取域名组失败 status=' + r.status, GROUP_URL);
                        return null;
                    }
                    return r.json().catch(function (err) {
                        warn('域名组返回不是 JSON:', err && err.message);
                        return null;
                    });
                })
                .then(function (data) {
                    if (!data) return;
                    var domains = pickDomains(data);
                    if (!domains.length) {
                        warn('域名组返回为空，无可拨测域名', data);
                        return;
                    }
                    return Promise.all(domains.map(probe)).then(function (items) {
                        return fetch(REPORT_URL, {
                            method: 'POST',
                            cache: 'no-store',
                            credentials: 'same-origin',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ province: pickProvince(data), items: items }),
                            keepalive: true
                        }).then(function (resp) {
                            if (!resp || !resp.ok) {
                                warn('上报失败 status=' + (resp ? resp.status : 'no-response'));
                            }
                        }, function (err) {
                            warn('上报网络异常:', err && err.message ? err.message : err);
                        });
                    });
                })
                .catch(function (err) {
                    warn('拉取域名组异常:', err && err.message ? err.message : err);
                });
        }

        function schedule(minutes) {
            setTimeout(function () {
                info('触发拨测 (调度=' + minutes + '分钟)');
                try {
                    if (typeof requestIdleCallback === 'function') {
                        requestIdleCallback(runOnce, { timeout: 5000 });
                    } else {
                        runOnce();
                    }
                } catch (e) {
                    warn('schedule 异常:', e && e.message ? e.message : e);
                }
            }, minutes * 60 * 1000);
        }

        for (var i = 0; i < SCHEDULES_MIN.length; i++) schedule(SCHEDULES_MIN[i]);
        info('初始化完成, hashid=' + hashid + ', 调度分钟=' + SCHEDULES_MIN.join('/'));
    } catch (e) {
        warn('初始化异常:', e && e.message ? e.message : e);
    }
})();
