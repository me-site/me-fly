import axios from 'axios';

export default async function handler(req, res) {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("No URL");

    // 1. 设置请求头（模拟真实的 4GTV 访问环境）
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.4gtv.tv/',
        'Origin': 'https://www.4gtv.tv/',
        'Accept': '*/*'
    };

    try {
        // 2. 发起请求 (使用 arraybuffer 兼容处理文本和切片)
        const response = await axios.get(targetUrl, {
            headers,
            timeout: 12000,
            responseType: 'arraybuffer',
            validateStatus: () => true 
        });

        // 检查源站状态
        if (response.status !== 200) {
            return res.status(response.status).send(`Target returned ${response.status}`);
        }

        const contentType = response.headers['content-type'] || "";
        const finalUrl = response.request.res.responseUrl || targetUrl;
        const data = response.data;

        // 设置通用响应头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');

        // 3. 核心逻辑：判断内容类型
        const isM3U8 = contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL') || targetUrl.includes('.m3u8');

        if (isM3U8) {
            // --- 处理 M3U8 重写 ---
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            let content = data.toString('utf8');
            
            // 获取基础路径用于补全
            const urlObj = new URL(finalUrl);
            const basePath = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
            const selfBase = `https://${req.headers.host}/api/proxy?url=`;

            const lines = content.split('\n');
            const processed = lines.map(line => {
                let l = line.trim();
                if (!l) return "";

                if (l.startsWith('#')) {
                    // 补丁：处理加密 Key 的 URI (对应 PHP 的 preg_replace_callback)
                    if (l.includes('URI="')) {
                        return l.replace(/URI="([^"]+)"/, (match, p1) => {
                            const abs = p1.startsWith('http') ? p1 : basePath + p1;
                            return `URI="${selfBase}${encodeURIComponent(abs)}"`;
                        });
                    }
                    return l;
                } else {
                    // 处理视频切片或二级索引
                    const abs = l.startsWith('http') ? l : basePath + l;
                    return `${selfBase}${encodeURIComponent(abs)}`;
                }
            });

            return res.status(200).send(processed.join('\n'));

        } else {
            // --- 处理 TS 切片、Key、图片等二进制流 ---
            res.setHeader('Content-Type', contentType || 'application/octet-stream');
            return res.status(200).send(data);
        }

    } catch (err) {
        return res.status(500).send("Proxy Error: " + err.message);
    }
}
