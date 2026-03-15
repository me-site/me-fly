const fetch = require('node-fetch');

export default async function handler(req, res) {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Missing url parameter. Usage: /api/proxy?url=YOUR_M3U8_URL');
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)',
                'Referer': new URL(targetUrl).origin
            },
            timeout: 9000 // 略低于 Vercel 的 10s 限制
        });

        const contentType = response.headers.get('content-type') || '';
        
        // 处理 M3U8 列表
        if (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) {
            let text = await response.text();
            const baseUrl = new URL(targetUrl);
            const proxyBase = `https://${req.headers.host}/api/proxy?url=`;

            const rewrittenText = text.split('\n').map(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return line;
                // 将相对地址补全为绝对地址并再次包装代理
                const absoluteUrl = new URL(trimmed, baseUrl.href).href;
                return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
            }).join('\n');

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(rewrittenText);
        }

        // 处理 TS 切片或其它二进制流
        const arrayBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(Buffer.from(arrayBuffer));

    } catch (e) {
        console.error('Proxy Error:', e.message);
        return res.status(500).send('Proxy Error: ' + e.message);
    }
}
