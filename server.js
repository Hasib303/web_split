const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());

// Serve static files (index.html, css/, js/)
app.use(express.static(__dirname));

// Proxy endpoint
app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Missing url parameter');
    }

    let responseSent = false;

    const sendError = (status, title, message) => {
        if (responseSent) return;
        responseSent = true;
        res.status(status).send(`
            <html>
            <body style="font-family: sans-serif; padding: 40px; background: #1a1a2e; color: #eee;">
                <h2>${title}</h2>
                <p>${message}</p>
            </body>
            </html>
        `);
    };

    try {
        const parsedUrl = new URL(targetUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const proxyReq = protocol.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        }, (proxyRes) => {
            if (responseSent) return;

            // Handle redirects
            if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                let redirectUrl = proxyRes.headers.location;

                // Handle relative redirects
                if (!redirectUrl.startsWith('http')) {
                    redirectUrl = new URL(redirectUrl, targetUrl).href;
                }

                responseSent = true;
                return res.redirect('/proxy?url=' + encodeURIComponent(redirectUrl));
            }

            // Copy headers but remove the ones that block iframes
            const headers = { ...proxyRes.headers };

            // Remove headers that block iframe embedding
            delete headers['x-frame-options'];
            delete headers['content-security-policy'];
            delete headers['content-security-policy-report-only'];

            // Set status and headers
            res.status(proxyRes.statusCode);

            for (const [key, value] of Object.entries(headers)) {
                if (!['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) {
                    try {
                        res.setHeader(key, value);
                    } catch (e) {
                        // Skip invalid headers
                    }
                }
            }

            responseSent = true;
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (error) => {
            console.error('Proxy error:', error.message);
            sendError(500, 'Failed to load page', `Could not connect to: ${targetUrl}<br><span style="color: #e94560;">${error.message}</span>`);
        });

        proxyReq.setTimeout(15000, () => {
            proxyReq.destroy();
            sendError(504, 'Request timed out', `The page took too long to respond: ${targetUrl}`);
        });

    } catch (error) {
        console.error('URL parsing error:', error.message);
        sendError(400, 'Invalid URL', error.message);
    }
});

app.listen(PORT, () => {
    console.log(`
========================================
  Split Browser Server Running!
========================================

  Open in your browser:
  http://localhost:3000

  Proxy endpoint:
  http://localhost:3000/proxy?url=https://google.com

========================================
`);
});
