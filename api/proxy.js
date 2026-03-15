export default async function handler(req, res) {
  const { url: targetUrl } = req.query;

  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(targetUrl).origin
      }
    });

    const contentType = response.headers.get('content-type') || '';

    // 处理 m3u8 播放列表
    if (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) {
      let text = await response.text();
      const baseUrl = new URL(targetUrl);
      const proxyBase = `https://${req.headers.host}/api/proxy?url=`;

      const rewrittenText = text.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) return line;
        const absoluteUrl = new URL(trimmed, baseUrl.href).href;
        return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
      }).join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(rewrittenText);
    }

    // 处理视频切片 (TS/MP4等)
    const arrayBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(Buffer.from(arrayBuffer));

  } catch (e) {
    return res.status(500).send('Proxy Error: ' + e.message);
  }
}
