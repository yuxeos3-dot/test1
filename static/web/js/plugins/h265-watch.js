/**
 * h265-watch —— 「H.265 源还能不能播」运行时判定核心（DX-999 / DX-119 / DX-070 三仓共享，字节级复制）
 * MACHINE_REV 5  ←— 多仓手工同步号，任何一仓改动需各仓同步并升号
 *   REV5：起播期致命 5xx 即判死（走到 fatal 说明 hls 重试已打光；CDN 对未回填 265 常回 502 而非 404）；
 *   播放中(哨兵期)的 5xx 维持计数自愈通道不变
 *   REV4：修 iOS 原生 HLS 路径两处误回退——①自动播放被拦/等手势期间浏览器不加载媒体数据，
 *   预算挂起不耗配额（真死源自有 media.error / NETWORK_NO_SOURCE 通路）；②原生路径关闭帧探针
 *   （iOS 对原生 HLS 的解码帧计数常年为 0，探针必误判；原生硬解 HEVC 无假活形态，失败必有 error）
 *
 * 判定架构（对应 h265-fallback 设计终稿）：
 *   第0层 确定性死刑（事件即判，零计时器）：
 *     - 致命 codec 类错误：Hls.ErrorDetails 键名解析成集合后等值匹配（非子串！bufferStalled 族进不来）
 *     - 致命 networkError 且 status 403/404：register() 对这两个码不 startLoad，流已无自救可能
 *     - 轨道证词：main 轨 init segment 解析完 tracks 无 video/audiovideo → 视频轨在解复用层就没了
 *   第1层 恢复轮次计数（对抗 recoverMediaError 的复位假象，不做任何快照比对）：
 *     - 致命 mediaError = register() 即将调 recoverMediaError（我们自己的代码，轮次完全可知）
 *     - 同一位置二连击 或 轮次达上限 → 判死；健康播过出错点 30 媒体秒后计数衰减归零
 *   第2层 假活探针（零计时器，抓「音在响画面黑」）：
 *     - 就绪后帧计数以【增量】比对（feed 单实例复用下绝对值恒 >0，必须用增量）
 *     - 用媒体秒度量（免疫后台标签页节流）；贴片/暂停期媒体时钟不走，天然不触发
 *   唯一墙钟 = 起播预算：从运行时 hls.config 推导（isFinite 过滤 Infinity），clamp 只是净化护栏；
 *     有生命证据（frag 事件 / 非致命重试错误）可续期一次后封顶 —— 有界，绝不无限续命。
 *
 * 版本无关性：不读 Hls.version（DX-070 为 undefined）；枚举全部按键名运行时解析，缺键静默降级；
 *   不用 FRAG_LOAD_PROGRESS / FRAG_PARSING_DATA（三仓 bundle 均已移除的 0.x 死键）。
 * 生命周期：switchURL 会销毁重建 hls 实例（旧实例监听随 removeAllListeners 消亡），
 *   本模块只在事件入口经 ensureHls() 对「新实例」按需重挂，blob: urlchange 短路防自递归；
 *   所有定时器闭包捕获 seq 纪元号并在触发时校验，杜绝 feed 逐条切源时的跨条目误伤。
 * 观测：window.__h265_trace 环形缓存最近 64 次迁移；设 window.__H265_BEACON__ = '上报URL'
 *   后 ready/fallback 两类终局会 sendBeacon 一发（默认不设即零网络请求）。
 */
define(function () {
  'use strict'

  var DEATH_KEYS = ['MANIFEST_INCOMPATIBLE_CODECS_ERROR', 'BUFFER_INCOMPATIBLE_CODECS_ERROR', 'BUFFER_ADD_CODEC_ERROR']
  var LIFE_KEYS = ['FRAG_LOADED', 'FRAG_BUFFERED', 'LEVEL_LOADED', 'BUFFER_APPENDED']

  function fin(v) {
    return typeof v === 'number' && isFinite(v) && v > 0 ? v : null
  }
  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v))
  }
  function dig(o, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (!o) return undefined
      o = o[keys[i]]
    }
    return o
  }

  function trace(evt, detail) {
    try {
      var buf = window.__h265_trace || (window.__h265_trace = [])
      buf.push({ t: Date.now(), e: evt, d: detail })
      if (buf.length > 64) buf.shift()
      var ep = window.__H265_BEACON__
      if (ep && navigator.sendBeacon && (evt === 'fallback' || evt === 'ready')) {
        navigator.sendBeacon(ep, JSON.stringify({ e: evt, d: detail, t: Date.now(), u: location.pathname }))
      }
    } catch (e) {
      /* 观测通道绝不影响播放 */
    }
  }

  /**
   * @param {object} opts
   * @param {object} opts.player      xgplayer 实例
   * @param {object} opts.Events      window.Player 的 Events 常量表
   * @param {function} opts.getHls    () => 当前 hls 实例 | null（原生 HLS 路径恒 null，判据自动降级）
   * @param {function} opts.doFallback (reason, extra) => void  执行真正的切源（模块保证每个观察周期至多调一次）
   * @param {boolean} [opts.rearmOnForeignUrl=true] 回退后若被外力（如防劫持在途请求）换到陌生源，重新武装一轮
   * @returns {{ arm:function, disarm:function, fallback:function, destroy:function, isDone:function }}
   */
  function createH265Watch(opts) {
    var player = opts.player
    var Events = opts.Events || {}
    var getHls = opts.getHls || function () { return null }
    var doFallback = opts.doFallback
    var rearmOnForeignUrl = opts.rearmOnForeignUrl !== false

    var destroyed = false
    var seq = 0 // arm/disarm 纪元号
    var state = 'idle' // idle | watching | recovering | ready | done

    var url264 = ''
    var budgets = computeBudgets(null)
    var aliveSinceArm = false // 本预算窗内是否出现过生命证据
    var renewals = 0
    var urlChangeRestarted = false // 观察期被外力换源时预算只重启一次
    var rearmedOnce = false // done 后对陌生源只重武装一轮，杜绝乒乓
    var mediaRounds = 0
    var lastMediaErrWall = 0
    var lastMediaErrPos = null
    var netFatals = 0
    var landedSinceRecovery = false
    var recoveryRenewed = false
    var framesBase = null
    var readyClock = 0
    var everReady = false
    var budgetTimer = null
    var recoveryTimer = null

    var enums = null // { deathSet, T_NET, T_MEDIA, EV } —— 同一 bundle 内恒定，解析一次
    var attachedHls = null

    // ---------- 只读探针 ----------
    function media() {
      try {
        return player.media || player.video || null
      } catch (e) {
        return null
      }
    }
    function readyStateOf() {
      // player.readyState 的 getter 无 null 守卫（media 为 null 时抛异常），必须 try
      try {
        var rs = player.readyState
        if (rs) return rs
      } catch (e) { /* fallthrough */ }
      var m = media()
      try {
        return (m && m.readyState) || 0
      } catch (e) {
        return 0
      }
    }
    function mediaTime() {
      var m = media()
      try {
        return (m && m.currentTime) || 0
      } catch (e) {
        return 0
      }
    }
    function readFrames() {
      var m = media()
      if (!m) return null
      try {
        if (typeof m.getVideoPlaybackQuality === 'function') return m.getVideoPlaybackQuality().totalVideoFrames
        if (typeof m.webkitDecodedFrameCount === 'number') return m.webkitDecodedFrameCount
      } catch (e) { /* fallthrough */ }
      return null
    }
    function isReadyStrict() {
      // 双腿就绪门：A 分歧两种世界都安全 ——
      // 「音轨可单独喂饱 readyState」的世界靠 videoWidth 腿挡住有声黑屏；
      // 「buffered 是交集」的世界里 videoWidth 腿恒真空转，零代价。
      if (readyStateOf() < 2) return false
      var m = media()
      try {
        return !!(m && m.videoWidth > 0)
      } catch (e) {
        return false
      }
    }
    function isArmedState() {
      return state === 'watching' || state === 'recovering' || state === 'ready'
    }
    function idleAwaitingGesture() {
      // 仅纯原生 HLS 路径（无 hls 实例，主要是 iOS Safari）：自动播放被拦/等待用户手势期间，
      // 浏览器根本不加载媒体数据，readyState 停在 0/1 并非源不可用——此状态不允许判死。
      // 真死源不会停留在这个形态：会产生 media.error(3/4) 或 networkState=NETWORK_NO_SOURCE(3)。
      if (attachedHls) return false
      var m = media()
      if (!m) return false
      try {
        if (m.error) return false
        if (m.networkState === 3) return false
        return !!m.paused && (m.readyState || 0) < 2 && (m.currentTime || 0) === 0
      } catch (e) {
        return false
      }
    }

    // ---------- 超时：全部来自运行时 hls.config，clamp 仅为净化护栏 ----------
    function computeBudgets(h) {
      var cfg = (h && h.config) || {}
      // isFinite 过滤是硬要求：实测存在 maxTimeToFirstByteMs = Infinity 的 bundle
      var ttfb = fin(dig(cfg, ['fragLoadPolicy', 'default', 'maxTimeToFirstByteMs'])) || fin(cfg.fragLoadingTimeOut) || 10000
      var mani = fin(dig(cfg, ['manifestLoadPolicy', 'default', 'maxLoadTimeMs'])) || fin(cfg.manifestLoadingTimeOut) || 10000
      var netMax = fin(dig(cfg, ['fragLoadPolicy', 'default', 'errorRetry', 'maxNumRetry'])) || fin(cfg.fragLoadingMaxRetry) || 6
      var mediaMax = Math.min(fin(cfg.appendErrorMaxRetry) || 3, 3)
      return {
        startMs: clamp(ttfb + mani, 8000, 20000), // 首窗；生命证据续期一次后封顶（最坏 2×startMs）
        recoverMs: clamp(ttfb, 4000, 12000), // recoverMediaError 复位重灌的观察窗，同样可续一次
        netMax: netMax,
        mediaMax: mediaMax
      }
    }

    // ---------- 枚举解析与 hls 实例迁移 ----------
    function resolveEnums(H) {
      if (enums || !H) return
      var ED = H.ErrorDetails || {}
      var ET = H.ErrorTypes || {}
      var set = {}
      var got = false
      for (var i = 0; i < DEATH_KEYS.length; i++) {
        var v = ED[DEATH_KEYS[i]]
        if (v) {
          set[v] = true
          got = true
        }
      }
      enums = {
        deathSet: got ? set : null, // 键全缺失则该死刑通路静默关闭（预算兜底仍在）
        T_NET: ET.NETWORK_ERROR,
        T_MEDIA: ET.MEDIA_ERROR,
        EV: H.Events || {}
      }
    }
    function ensureHls() {
      var h
      try {
        h = getHls()
      } catch (e) {
        h = null
      }
      if (!h || h === attachedHls) return
      attachedHls = h
      try {
        resolveEnums(h.constructor)
      } catch (e) { /* 解析失败按缺键降级 */ }
      budgets = computeBudgets(h)
      var EV = (enums && enums.EV) || {}
      for (var i = 0; i < LIFE_KEYS.length; i++) {
        var v = EV[LIFE_KEYS[i]]
        if (v) h.on(v, onLifeTick)
      }
      if (EV.FRAG_PARSING_INIT_SEGMENT) h.on(EV.FRAG_PARSING_INIT_SEGMENT, onInitSegment)
      // 旧实例不必解绑：switchURL 路径上它已被 destroy()+removeAllListeners
    }

    // ---------- hls 级信号 ----------
    function onLifeTick(evtName) {
      if (destroyed || !isArmedState()) return
      aliveSinceArm = true
      if (state === 'recovering' && enums && (evtName === enums.EV.FRAG_BUFFERED || evtName === enums.EV.BUFFER_APPENDED)) {
        // 复位后有新数据落盘 = 恢复在真实推进（网络侧的 FRAG_LOADED/LEVEL_LOADED 不算，那证明不了媒体管线复活）
        landedSinceRecovery = true
      }
    }
    function onInitSegment(evtName, payload) {
      if (destroyed || !isArmedState()) return
      var id = payload && (payload.id || (payload.frag && payload.frag.type))
      if (id && id !== 'main') return // alt-audio 轨的 init segment 不构成视频轨证词
      var t = (payload && payload.tracks) || {}
      if (!t.video && !t.audiovideo) verdict('no-video-track')
    }

    // ---------- player 级信号 ----------
    function onProgress() {
      if (destroyed) return
      ensureHls()
      if (state === 'watching' || state === 'recovering') {
        aliveSinceArm = true
        if (isReadyStrict()) toReady()
      } else if (state === 'ready') {
        probeZombie()
        decayMediaRounds()
      }
    }
    function onHlsErrorEvt(e) {
      // emit('HLS_ERROR') 在 if(data.fatal) 之外：非致命错误（含 hls 按 policy 重试的超时）只当生命心跳
      if (destroyed || !isArmedState()) return
      ensureHls()
      if (e && !e.errorFatal) aliveSinceArm = true
    }
    function onPlayerError(err) {
      // emit('error', data) 只在 fatal 分支内且传 hls 原始对象（带 type/details/networkDetails）；
      // 原生 HLS 路径的 error 事件无 details/type，走 media.error.code（W3C 稳定 1..4）
      if (destroyed || !isArmedState()) return
      ensureHls()
      if (err && err.details && err.type) {
        if (err.fatal !== true) return
        if (enums && enums.deathSet && enums.deathSet[err.details]) return verdict('codec:' + err.details)
        if (enums && err.type === enums.T_NET) {
          var st = err.networkDetails && err.networkDetails.status
          if (st === 403 || st === 404) return verdict('net-' + st)
          // 起播期致命 5xx 即判死：走到 fatal 说明 hls 自身重试已打光（该源已连续失败），
          // 服务端错误族起播期自愈概率极低而 264 一步之遥；CDN 对未回填 265 也常回 502 而非 404。
          // 播放中(everReady)的 5xx 仍走下方计数自愈——播到一半的 CDN 抖动值得等。
          if (typeof st === 'number' && st >= 500 && !everReady) return verdict('net-' + st)
          netFatals++
          if (netFatals >= budgets.netMax) return verdict('net-loop')
          return enterRecovering('net') // register() 已 startLoad 自救，给一个落盘观察窗
        }
        if (enums && err.type === enums.T_MEDIA) return onMediaFatal()
        // 枚举未解析成功时的致命错误：不冒判，留给预算兜底
        return
      }
      var m = media()
      var code = m && m.error && m.error.code
      if (code === 3 || code === 4) verdict('media-code-' + code) // 原生路径解码/源不支持，无恢复机制，即判
    }
    function onLoadStart() {
      // hls attachMedia 设 blob src 时 media 即发 loadstart，早于 manifest/init segment——
      // 这是把监听挂上新 hls 实例的最早入口；只迁移监听，不作生命证据（loadstart 不代表有数据在流动）
      if (destroyed) return
      ensureHls()
    }
    function onUrlChange(url) {
      if (destroyed) return
      if (typeof url === 'string' && /^blob:/.test(url)) return // hls attach 产生的 blob src，防自递归
      // 插件的 URL_CHANGE 监听注册在先且 handler 内同步重建 hls，本回调执行时新实例已存在，立即迁移监听
      ensureHls()
      if (state === 'done') {
        // 回退后被外力（防劫持的在途 getPlayUrl 等）切到陌生源：重武装一轮看住它。
        // 只重武装一次：第二轮判死时防劫持 once 槽已耗尽，不存在乒乓。
        if (rearmOnForeignUrl && !rearmedOnce && url && url !== url264) {
          rearmedOnce = true
          trace('rearm', String(url).slice(0, 120))
          armCore()
        }
        return
      }
      if (isArmedState() && !urlChangeRestarted) {
        // 观察期被外力换源（防劫持重取同码流等）：证据清零、预算重启一次；
        // hls 新实例的监听迁移由下一个事件入口的 ensureHls() 完成
        urlChangeRestarted = true
        resetEvidence()
        state = 'watching'
        armBudget()
      }
    }
    function onDestroyEvt() {
      destroy()
    }

    // ---------- 判定状态机 ----------
    function resetEvidence() {
      aliveSinceArm = false
      renewals = 0
      mediaRounds = 0
      lastMediaErrWall = 0
      lastMediaErrPos = null
      netFatals = 0
      landedSinceRecovery = false
      recoveryRenewed = false
      framesBase = null
      readyClock = 0
      everReady = false // 每次 arm 独立判断"是否曾就绪"（5xx 起播/播中分档依赖它）
      clearTimers()
    }
    function clearTimers() {
      if (budgetTimer) {
        clearTimeout(budgetTimer)
        budgetTimer = null
      }
      if (recoveryTimer) {
        clearTimeout(recoveryTimer)
        recoveryTimer = null
      }
    }
    function armBudget() {
      var mySeq = seq // 纪元号只由 arm/disarm/destroy 递增；定时器触发时校验即可失效旧回调
      if (budgetTimer) clearTimeout(budgetTimer)
      budgetTimer = setTimeout(function () {
        if (destroyed || mySeq !== seq || state !== 'watching') return
        budgetTimer = null
        if (isReadyStrict()) return toReady()
        if (idleAwaitingGesture()) return armBudget() // 等手势中：整窗重挂，不消耗续期配额
        if (aliveSinceArm && renewals < 1) {
          renewals++
          aliveSinceArm = false
          return armBudget()
        }
        // 有过证据 → 慢（含 FRAG_LOADING 静默传输形，与真死在证据空间不可分，属有界产品取舍：
        // 切到 264 的代价是带宽不是黑屏）；从未有证据 → 起播即冻结
        verdict(renewals > 0 || aliveSinceArm ? 'slow-budget' : 'startup-timeout')
      }, budgets.startMs)
    }
    function enterRecovering(kind) {
      if (!isArmedState()) return
      state = 'recovering'
      clearTimers()
      landedSinceRecovery = false
      recoveryRenewed = false
      armRecoveryTimer(kind)
    }
    function armRecoveryTimer(kind) {
      var mySeq = seq
      recoveryTimer = setTimeout(function () {
        if (destroyed || mySeq !== seq || state !== 'recovering') return
        recoveryTimer = null
        if (isReadyStrict()) return toReady()
        if (landedSinceRecovery && !recoveryRenewed) {
          recoveryRenewed = true
          landedSinceRecovery = false
          return armRecoveryTimer(kind)
        }
        verdict('recover-timeout-' + kind) // 两窗零落盘（或落盘后仍起不来）→ 恢复失败
      }, budgets.recoverMs)
    }
    function onMediaFatal() {
      var now = Date.now()
      if (state === 'recovering' && now - lastMediaErrWall < 800) return // 同一事故的毫秒级连发只算一轮
      var pos = mediaTime()
      var samePos = lastMediaErrPos != null && Math.abs(pos - lastMediaErrPos) < 2
      mediaRounds++
      lastMediaErrWall = now
      lastMediaErrPos = pos
      // 同一位置二连击（播到坏帧→recover→重灌→又死在原地的乒乓）提前判死；否则按轮次上限
      if (mediaRounds >= budgets.mediaMax || (samePos && mediaRounds >= 2)) return verdict('media-x' + mediaRounds)
      enterRecovering('media')
    }
    function toReady() {
      state = 'ready'
      clearTimers()
      // 网络错误计数只用于识别「自救死循环」——真正的死循环到不了 ready，就绪即清零，
      // 防止长会话里多次各自恢复成功的无关网络毛刺终身累计误触 net-loop
      netFatals = 0
      framesBase = readFrames() // null = 帧 API 不可用，假活探针静默关闭
      readyClock = mediaTime()
      if (!everReady) {
        everReady = true
        trace('ready', '')
      }
      // 就绪≠终点：监听保留（哨兵态），中途 403/解码复发/假活仍有回退通路
    }
    function probeZombie() {
      // 原生 HLS 路径关闭探针：iOS 对原生 HLS 的帧计数常年为 0（framesDelta 恒 0 会误杀健康 265）；
      // 且原生硬解 HEVC 不存在“解复用丢轨”假活形态，真实失败必有 error 事件兜底
      if (!attachedHls) return
      if (framesBase == null) return
      var t = mediaTime()
      if (t - readyClock < 4) return // 4 媒体秒：大于正常流关键帧间隔；暂停/贴片期媒体钟不走，不会误触
      var f = readFrames()
      if (f != null && f - framesBase === 0) verdict('zombie-frames')
      else framesBase = null // 有帧产出，探针使命完成，停止比对
    }
    function decayMediaRounds() {
      if (mediaRounds > 0 && lastMediaErrPos != null && mediaTime() - lastMediaErrPos > 30) {
        mediaRounds = 0
        lastMediaErrPos = null
      }
    }
    function verdict(reason, extra) {
      if (destroyed || state === 'done' || state === 'idle') return
      state = 'done'
      clearTimers()
      console.warn('[H265] 回退 H264：' + reason)
      trace('fallback', reason)
      // 判决即时，执行回退必须推迟一个宏任务：错误驱动的判决同步跑在旧 hls 自己的 ERROR
      // 派发栈内，此时同步 switchURL 会让插件在派发中途 destroy 旧实例，栈回卷后旧实例的
      // 收尾(detach→removeAttribute('src')+load())会把刚挂上的新源擦掉——媒体元素永久转圈。
      // 推迟到派发栈结束后再切源，用户感知仍是毫秒级。
      setTimeout(function () {
        if (destroyed) return
        try {
          doFallback(reason, extra)
        } catch (e) {
          console.error('[H265] 回退执行失败', e)
        }
      }, 0)
    }

    // ---------- 装配 ----------
    function armCore() {
      seq++
      resetEvidence()
      urlChangeRestarted = false
      state = 'watching'
      ensureHls()
      budgets = computeBudgets(attachedHls)
      armBudget()
      if (!attachedHls) {
        // arm 常发生在 new Player 同步栈内，此刻 plugin.hls 仍是 null（register 在 beforePlayerInit
        // 微任务后）。补一发宏任务重试，让 hls 级监听（轨道证词/生命证据）在首个 init segment 之前挂上；
        // DX-119 的 hls 更晚（播放启动流程）时由 loadstart/首个事件入口兜住
        var mySeq = seq
        setTimeout(function () {
          if (destroyed || mySeq !== seq) return
          ensureHls()
        }, 0)
      }
      trace('arm', '')
    }

    var URL_CHANGE = Events.URL_CHANGE || 'urlchange'
    var bindings = [
      [Events.LOAD_START || 'loadstart', onLoadStart],
      [Events.PLAY || 'play', onProgress], // 用户手势起播：结束 idleAwaitingGesture 挂起，预算恢复计数
      [Events.CANPLAY, onProgress],
      [Events.PLAYING, onProgress],
      [Events.TIME_UPDATE, onProgress],
      ['HLS_ERROR', onHlsErrorEvt],
      [Events.ERROR, onPlayerError],
      [URL_CHANGE, onUrlChange],
      [Events.DESTROY, onDestroyEvt]
    ]
    for (var b = 0; b < bindings.length; b++) {
      if (bindings[b][0]) player.on(bindings[b][0], bindings[b][1])
    }

    function destroy() {
      if (destroyed) return
      destroyed = true
      seq++
      clearTimers()
      state = 'idle'
      for (var i = 0; i < bindings.length; i++) {
        if (bindings[i][0]) {
          try {
            player.off(bindings[i][0], bindings[i][1])
          } catch (e) { /* NOOP */ }
        }
      }
      attachedHls = null
    }

    return {
      /** 开始观察当前源（认定其为 265）。feed 场景每条 265 切入后调用；detail 页创建后立即调用 */
      arm: function (u264) {
        if (destroyed) return
        url264 = u264 || url264
        rearmedOnce = false
        armCore()
      },
      /** 作废当前观察（feed 切下一条前必调）。已挂监听保留但全部惰性 */
      disarm: function () {
        if (destroyed) return
        seq++
        resetEvidence()
        state = 'idle'
      },
      /** 外部强制回退（如 errorRetry 403 钩子），走统一判决通道保证幂等 */
      fallback: function (reason, extra) {
        verdict('forced:' + reason, extra)
      },
      destroy: destroy,
      isDone: function () {
        return state === 'done'
      }
    }
  }

  return { createH265Watch: createH265Watch }
})
