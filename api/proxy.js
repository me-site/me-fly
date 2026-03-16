import axios from 'axios';
import { Stream } from 'stream';

export default async function handler(req, res) {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("No URL provided");

    const isTS = req.query.type === 'ts' || targetUrl.includes('.ts') || targetUrl.includes('.m4s');

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.4gtv.tv/',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        const response = await axios.get(targetUrl, {
            headers: headers,
            timeout: isTS ? 30000 : 10000,
            responseType: isTS ? 'stream' : 'text',
            validateStatus: () => true
        });

        // 设置跨域头
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (isTS) {
            // 切片流式转发
            res.setHeader('Content-Type', 'video/mp2t');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            if (response.data instanceof Stream) {
                response.data.pipe(res);
            } else {
                res.status(500).send("Stream error");
            }
        } else {
            // 非切片直接透传
            res.status(response.status).send(response.data);
        }
    } catch (err) {
        res.status(500).send("Proxy Error: " + err.message);
    }
}
