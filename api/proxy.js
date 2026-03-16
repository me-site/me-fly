import axios from 'axios';

export default async function handler(req, res) {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('使用方法: /proxy?url=直播地址');

    // 1. 构造台湾伪装 Header 和随机 IP
    const taiwanIp = `125.227.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
    const urlObj = new URL(targetUrl);
    
    const commonHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'X-Forwarded-For': taiwanIp,
        'Client-IP': taiwanIp,
        'Referer': `https://${urlObj.host}/`,
        'Accept-Language': 'zh-TW,zh;q=0.9'
    };

    try {
        // 2. 获取目标内容（自动跟随重定向）
        const response = await axios.get(targetUrl, {
            headers: commonHeaders,
            timeout: 12000,
            responseType: targetUrl.includes('.m3u8') ? 'text' : 'stream', // M3U8 处理文本，切片处理流
            validateStatus: (status) => status >= 200 && status < 400
        });

        const finalUrl = response.request.res.responseUrl || targetUrl;
        const contentType = response.headers['content-type'];

        // 设置通用响应头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');

        // 3. 处理 M3U8 列表重写
        if (typeof response.data === 'string' && response.data.includes('#EXTM3U')) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            
            const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
            const selfProxyBase = `https://${req.headers.host}/proxy?url=`;

            const lines = response.data.split('\n');
            const processedLines = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return trimmed;
                
                // 补全绝对路径
                const absUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
                // 将切片地址再次指向 Vercel 自己的代理接口
                return selfProxyBase + encodeURIComponent(absUrl);
            });

            return res.status(200).send(processedLines.join('\n'));
        } 

        // 4. 处理 TS 切片或其它二进制流（直接转发）
        res.setHeader('Content-Type', contentType || 'video/mp2t');
        response.data.pipe(res);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).send('Vercel 代理失败: ' + error.message);
    }
}
