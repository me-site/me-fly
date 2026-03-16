export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ipCountry = request.headers.get('x-vercel-ip-country') || 'unknown';
    const ipRegion = request.headers.get('x-vercel-ip-region') || 'unknown';

    // 可以添加自定义逻辑：比如缓存、重定向、请求转发等
    console.log(`Request from: ${ipCountry}-${ipRegion}`);

    // 你可以使用条件判断，例如：
    if (ipCountry === 'HK') {
      return fetch('https://your-hk-live-server.com/stream');
    }

    return fetch('https://your-global-live-server.com/stream');
  }
}
