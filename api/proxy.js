import axios from 'axios';

export default async function handler(req, res) {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('未提供 URL 参数');

    try {
        const response = await axios.get(targetUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': new URL(targetUrl).origin
            }
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/vnd.apple.mpegurl');
        
        // 如果是 m3u8 内容，将内部的相对路径补全为绝对路径
        let data = response.data;
        if (typeof data === 'string' && data.includes('#EXTM3U')) {
            const originBase = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
            data = data.split('\n').map(line => {
                if (line.trim() !== '' && !line.startsWith('#') && !line.startsWith('http')) {
                    return originBase + line;
                }
                return line;
            }).join('\n');
        }

        res.status(200).send(data);
    } catch (error) {
        res.status(500).send('代理失败: ' + error.message);
    }
}
