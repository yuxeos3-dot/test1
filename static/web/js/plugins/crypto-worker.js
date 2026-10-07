// 克隆站专用:透传版图片 worker。
// 原站此 worker 负责解密 CDN 加密图;本地 /img/* 已是解密后的真实图片,
// 故这里只 fetch 并原样返回,避免被"再次解密"而损坏。协议与原站一致。
self.onmessage = async (e) => {
  const msg = e.data || {};
  const { data, key, responseType } = msg;
  try {
    const resp = await fetch(data);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const blob = await resp.blob();
    let url = '';
    try { url = URL.createObjectURL(blob); } catch (_) { url = (typeof data === 'string') ? data : ''; }
    self.postMessage({ key, result: { url, file: blob } });
  } catch (err) {
    self.postMessage({ key, error: String(err && err.message || err) });
  }
};
