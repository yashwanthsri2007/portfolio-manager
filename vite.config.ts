import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Helper to read request body in Node connect middleware
const getRequestBody = (req: any): Promise<string> => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => resolve(body));
  });
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-proxy-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url) return next();

            // ─── 1. FINNHUB API PROXY ───────────────────────────────────────
            if (req.url.startsWith('/api/finnhub')) {
              try {
                const parsedUrl = new URL(req.url, 'http://localhost');
                const subPath = parsedUrl.pathname.replace(/^\/api\/finnhub/, '');

                // Prioritize client-sent header, then query param, then server environment variable
                const clientToken = req.headers['x-finnhub-token'] as string;
                const token = clientToken || parsedUrl.searchParams.get('token') || env.FINNHUB_API_KEY || env.VITE_FINNHUB_API_KEY || '';

                if (subPath === '/test-connection') {
                  if (!token) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                      success: false, 
                      message: 'No Finnhub API key found. Enter it in Settings or add FINNHUB_API_KEY in .env.' 
                    }));
                  }

                  const start = Date.now();
                  const testRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${token}`);
                  const latency = Date.now() - start;

                  if (testRes.status === 401 || testRes.status === 403) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                      success: false, 
                      message: 'Invalid Finnhub API Key. Authentication failed (401/403).' 
                    }));
                  }

                  if (testRes.status === 429) {
                    res.writeHead(429, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                      success: false, 
                      message: 'Finnhub API Rate Limit exceeded (30 req/min for free tier).' 
                    }));
                  }

                  if (testRes.ok) {
                    const data = await testRes.json() as { c?: number };
                    if (data && typeof data.c === 'number' && data.c > 0) {
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({ 
                        success: true, 
                        message: `Connected to Finnhub successfully (${latency}ms). Live AAPL: $${data.c}`,
                        latency 
                      }));
                    }
                  }

                  res.writeHead(testRes.status, { 'Content-Type': 'application/json' });
                  return res.end(JSON.stringify({ 
                    success: false, 
                    message: `Finnhub returned HTTP ${testRes.status}: Unable to fetch quote data.` 
                  }));
                }

                // Append token to outgoing proxy call
                parsedUrl.searchParams.set('token', token);
                const targetUrl = `https://finnhub.io/api/v1${subPath}?${parsedUrl.searchParams.toString()}`;

                const proxyRes = await fetch(targetUrl);
                const bodyText = await proxyRes.text();

                res.writeHead(proxyRes.status, {
                  'Content-Type': proxyRes.headers.get('content-type') || 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(bodyText);
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message || 'Finnhub proxy error' }));
              }
              return;
            }

            // ─── 2. GOOGLE GEMINI API PROXY ─────────────────────────────────
            if (req.url.startsWith('/api/gemini')) {
              try {
                const parsedUrl = new URL(req.url, 'http://localhost');
                const subPath = parsedUrl.pathname.replace(/^\/api\/gemini/, '');

                const clientKey = req.headers['x-gemini-key'] as string;
                const token = clientKey || parsedUrl.searchParams.get('key') || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '';

                // A. Test Connection endpoint
                if (subPath === '/test-connection') {
                  if (!token) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                      success: false, 
                      message: 'No Google Gemini API key found. Enter it in Settings or set GEMINI_API_KEY in .env.' 
                    }));
                  }

                  const start = Date.now();
                  const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${token}`;
                  
                  const geminiRes = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [{ role: 'user', parts: [{ text: 'Ping. Reply with exactly the single word: PONG.' }] }]
                    })
                  });

                  const latency = Date.now() - start;
                  const data = await geminiRes.json() as any;

                  if (geminiRes.status === 400) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                      success: false, 
                      message: data.error?.message || 'Invalid Gemini API Key or malformed request.' 
                    }));
                  }

                  if (geminiRes.status === 401 || geminiRes.status === 403) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                      success: false, 
                      message: 'Invalid Gemini API Key. Authentication failed (401/403).' 
                    }));
                  }

                  if (geminiRes.status === 429) {
                    res.writeHead(429, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                      success: false, 
                      message: 'Gemini API Rate Limit / Quota exceeded (HTTP 429). Check your Google AI Studio plan.' 
                    }));
                  }

                  if (geminiRes.ok) {
                    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'PONG';
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                      success: true, 
                      message: `Connected to Google Gemini successfully (${latency}ms). Model: gemini-3.8-flash`,
                      latency,
                      model: 'gemini-3.8-flash',
                      preview: reply
                    }));
                  }

                  res.writeHead(geminiRes.status, { 'Content-Type': 'application/json' });
                  return res.end(JSON.stringify({ 
                    success: false, 
                    message: data.error?.message || `Gemini returned HTTP ${geminiRes.status}` 
                  }));
                }

                // B. Chat / Generate endpoint
                if (subPath === '/generate') {
                  if (req.method !== 'POST') {
                    res.writeHead(405, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
                  }

                  if (!token) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                      success: false, 
                      error: 'Missing Gemini API Key. Configure your key in Settings or .env.' 
                    }));
                  }

                  const rawBody = await getRequestBody(req);
                  let parsedPayload: any = {};
                  try {
                    parsedPayload = JSON.parse(rawBody);
                  } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                  }

                  const { prompt, systemInstruction, contextText, model = 'gemini-3.8-flash' } = parsedPayload;

                  const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${token}`;

                  const geminiRes = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                      contents: [
                        {
                          role: 'user',
                          parts: [{ text: `${contextText ? `${contextText}\n\n` : ''}USER QUESTION: ${prompt}` }]
                        }
                      ],
                      generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 1024
                      }
                    })
                  });

                  const geminiData = await geminiRes.json() as any;

                  if (geminiRes.ok) {
                    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                      success: true, 
                      text, 
                      model, 
                      isLive: true 
                    }));
                  } else {
                    res.writeHead(geminiRes.status, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ 
                      success: false, 
                      error: geminiData.error?.message || `Gemini API returned status ${geminiRes.status}` 
                    }));
                  }
                }

                // If unrecognized subpath under /api/gemini
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Gemini endpoint not found' }));
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message || 'Gemini proxy error' }));
              }
              return;
            }

            next();
          });
        }
      }
    ],
  };
});
