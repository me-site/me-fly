export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    // 增加自动识别：如果 URL 包含 .ts 或有 type=ts 参数，均视为切片
    const isTS = url.searchParams.get('type') === 'ts' || targetUrl?.includes('.ts');

    if (!targetUrl) return new Response('Missing URL', { status: 400 });

    const headers = new Headers();
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    headers.set('Referer', 'https://www.4gtv.tv/');

    // --- TS 切片：处理缓存与流式转发 ---
    if (isTS) {
      const cache = caches.default;
      let response = await cache.match(request);
      
      if (!response) {
        const originRes = await fetch(targetUrl, { 
          headers, 
          redirect: 'follow' 
        });
        
        // 关键：只有 200 OK 才进入缓存逻辑
        if (originRes.status === 200) {
          // 必须重新构造 Response 才能修改 Header 并存入缓存
          const newRes = new Response(originRes.body, originRes);
          newRes.headers.set('Cache-Control', 'public, max-age=3600');
          newRes.headers.set('Access-Control-Allow-Origin', '*');
          
          // 异步写入缓存
          ctx.waitUntil(cache.put(request, newRes.clone()));
          return newRes;
        }
        return originRes;
      }
      return response;
    }

    // --- 非 TS 请求（M3U8/Key 等）：直接透传并补全跨域头 ---
    const originRes = await fetch(targetUrl, { headers, redirect: 'follow' });
    const newRes = new Response(originRes.body, originRes);
    newRes.headers.set('Access-Control-Allow-Origin', '*');
    
    return newRes;
  }
};
