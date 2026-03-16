import axios from 'axios';
import { Stream } from 'stream';

export default async function handler(req, res) {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("#EXTM3U\n#ERROR: No URL provided");

    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    const referer = "https://www.4gtv.tv/";

    try {
        // 判断是否为 TS 切片请求
        const isTS = targetUrl.includes('.ts') || req.query.type === 'ts';

        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': ua, 'Referer': referer },
            timeout: isTS ? 45000 : 15000,
            responseType: isTS ? 'stream' : 'text', // 核心优化：TS 走流，M3U8 走文本
            validateStatus: () => true
        });

        // 基础响应头
        res.setHeader('Access-Control-Allow-Origin', '*');
        const finalUrl = response.request.res.responseUrl || targetUrl;

        if (isTS) {
            // --- 逻辑分流：TS 切片流式转发 (类似 PHP fpassthru) ---
            res.setHeader('Content-Type', 'video/mp2t');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            
            // 将 axios 的响应流直接导向 Vercel 的响应
            if (response.data instanceof Stream) {
                response.data.pipe(res);
            } else {
                res.status(500).send("Stream error");
            }
        } else {
            // --- 逻辑分流：M3U8 列表解析与重写 ---
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

            const content = response.data;
            const urlObj = new URL(finalUrl);
            const basePath = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
            const query = urlObj.search; // 透传原始 Token 参数
            
            // 自动获取当前 Vercel 域名
            const selfUrl = `https://${req.headers.host}/api/proxy?url=`;

            const lines = content.split('\n');
            const processed = lines.map(line => {
                const l = line.trim();
                if (!l) return "";

                if (l.startsWith('#')) {
                    // 处理加密 Key URI
                    if (l.includes('URI="')) {
                        return l.replace(/URI="([^"]+)"/, (match, p1) => {
                            const abs = p1.startsWith('http') ? p1 : (basePath + p1 + query);
                            return `URI="${selfUrl}${encodeURIComponent(abs)}"`;
                        });
                    }
                    return l;
                } else {
                    // 处理 TS 链接并添加 type=ts 标记
                    const abs = l.startsWith('http') ? l : (basePath + l + query);
                    const connector = abs.includes('?') ? '&' : '?';
                    return `${selfUrl}${encodeURIComponent(abs)}${connector}type=ts`;
                }
            });

            res.status(200).send(processed.join('\n'));
        }
    } catch (err) {
        res.status(500).send(`#EXTM3U\n#ERROR: ${err.message}`);
    }
}
