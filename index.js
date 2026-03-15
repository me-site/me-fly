const express = require('express');
const app = express();

app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url parameter');

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
                'Referer': new URL(targetUrl).origin
            }
        });

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) {
            let text = await response.text();
            const baseUrl = new URL(targetUrl);
            const proxyBase = `https://${req.headers.host}/api/proxy?url=`;

            const rewrittenText = text.split('\n').map(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return line;
                return `${proxyBase}${encodeURIComponent(new URL(trimmed, baseUrl.href).href)}`;
            }).join('\n');

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(rewrittenText);
        }

        const data = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(Buffer.from(data));
    } catch (e) {
        res.status(500).send('Error: ' + e.message);
    }
});

// 根目录访问提示
app.get('/', (req, res) => res.send('IPTV Proxy is running in Hong Kong!'));

module.exports = app;
