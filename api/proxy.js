const axios = require('axios');

export default async function handler(req, res) {
  // 获取要代理的目标 URL，例如：/api/proxy?url=http://example.com/live.m3u8
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000 // 10秒超时，适应 Vercel 限制
    });

    // 设置跨域头，允许播放器调用
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers['content-type']);

    // 将直播流管道传输给客户端
    response.data.pipe(res);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send('Error fetching the stream');
  }
}
