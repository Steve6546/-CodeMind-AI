// CodeMind-AI/fetch-proxy.mjs
import http from 'http';
import url from 'url';
import axios from 'axios';
import { JSDOM } from 'jsdom';

const PORT = 3001; // You can change this if needed, but report it back

const server = http.createServer(async (req, res) => {
    const reqUrl = url.parse(req.url, true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for local dev
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (reqUrl.pathname === '/fetch-url' && req.method === 'GET') {
        const targetUrl = reqUrl.query.url;

        if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'URL parameter is missing' }));
            return;
        }

        console.log(`[FetchProxy] Received request for URL: ${targetUrl}`);

        try {
            const response = await axios.get(targetUrl, {
                headers: {
                    'User-Agent': 'CodeMindAI_Fetch_Proxy/1.0', // Be a good web citizen
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                },
                timeout: 15000 // 15 seconds timeout
            });

            const htmlContent = response.data;
            let textContent = '';

            try {
                const dom = new JSDOM(htmlContent, { url: targetUrl });
                // Readability is not directly available on JSDOM instance,
                // it needs to be imported and instantiated if available in the environment.
                // For this step, we'll keep it simpler and rely on textContent,
                // as Readability itself is a separate library not explicitly installed.
                // const reader = new dom.window.Readability(dom.window.document); // This would fail if Readability lib not present
                // const article = reader.parse();
                // textContent = article ? article.textContent : '';
                
                // Fallback to body.textContent as Readability is not standard in JSDOM
                // and might not be available or might be complex to integrate here without explicit install.
                textContent = dom.window.document.body?.textContent || '';
                
                // Fallback if Readability fails to extract much (This logic block might be less relevant without actual Readability)
                if (!textContent || textContent.length < 100) {
                    console.log("[FetchProxy] Readability extracted little content (or not used), trying body.textContent more directly");
                    const bodyText = dom.window.document.body?.textContent; // Re-confirming body text
                    if (bodyText && bodyText.length > textContent.length) {
                        textContent = bodyText;
                    }
                }

            } catch (parseError) {
                console.error(`[FetchProxy] Error parsing HTML with JSDOM for ${targetUrl}:`, parseError.message);
                // Fallback: try to extract text from body if JSDOM failed severely
                try {
                    const basicDom = new JSDOM(htmlContent);
                    textContent = basicDom.window.document.body?.textContent || '';
                } catch (basicParseError) {
                     console.error(`[FetchProxy] Basic body text extraction also failed for ${targetUrl}:`, basicParseError.message);
                     textContent = ''; // No text if all parsing fails
                }
                if (!textContent) {
                     console.warn(`[FetchProxy] Could not extract meaningful text for ${targetUrl}. Returning raw HTML in textContent field for now.`);
                     textContent = htmlContent; // As a last resort, send HTML as text. AgentCore can decide what to do.
                }
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                textContent: textContent.trim(),
                htmlContent: htmlContent // Optionally send raw HTML too
            }));
            console.log(`[FetchProxy] Successfully fetched and processed ${targetUrl}. Text length: ${textContent.trim().length}`);

        } catch (error) {
            console.error(`[FetchProxy] Error fetching URL ${targetUrl}:`, error.message);
            let errorMessage = error.message;
            if (error.isAxiosError && error.response) {
                errorMessage = `Failed with status ${error.response.status}: ${error.response.statusText}`;
            } else if (error.code) {
                errorMessage = `Network error: ${error.code}`;
            }
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: errorMessage, textContent: null, htmlContent: null }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`[FetchProxy] Server is listening on http://localhost:${PORT}`);
    console.log(`[FetchProxy] Endpoint ready at http://localhost:${PORT}/fetch-url`);
});
