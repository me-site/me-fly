import axios from 'axios';
import { Stream } from 'stream';

export default async function handler(req, res) {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("No URL");

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.4gtv.tv/'
    };

    try {
        const isTS = req.query.type === 'ts' || targetUrl.includes('.ts') || targetUrl.includes('.m4s') || targetUrl.includes('.mp4');

        const response = await axios.get(targetUrl, {
            headers: headers,
            timeout: isTS ? 30000 : 15000,
            responseType: isTS ? 'stream' : 'text',
            validateStatus: () => true
        });

        res.setHeader('Access-Control-Allow-Origin', '*');

        if (isTS) {
            // --- 视频流切片转发 ---
            res.setHeader('Content-Type', 'video/mp2t');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            response.data.pipe(res);
        } else if (typeof response.data === 'string' && response.data.includes('#EXTM3U')) {
            // --- 关键：二级 M3U8 递归重写 ---
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            const basePath = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
            const selfUrl = `https://${req.headers.host}${req.url.split('?')[0]}?url=`;

            const lines = response.data.split('\n');
            const processed = lines.map(line => {
                const l = line.trim();
                if (!l || l.startsWith('#')) return l;
                const abs = l.startsWith('http') ? l : (basePath + l);
                return `${selfUrl}${encodeURIComponent(abs)}&type=ts`;
            }).join('\n');

            res.send(processed);
        } else {
            // --- 其他：MPD、Key、Init Segment ---
            res.status(response.status).send(response.data);
        }
    } catch (err) {
        res.status(500).send("Proxy Error: " + err.message);
    }
}
