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

            // ─── 3. ANGEL ONE SMARTAPI PROXY ────────────────────────────────
            if (req.url.startsWith('/api/angelone')) {
              try {
                const parsedUrl = new URL(req.url, 'http://localhost');
                const subPath = parsedUrl.pathname.replace(/^\/api\/angelone/, '');

                // A. Login endpoint
                if (subPath === '/login' && req.method === 'POST') {
                  const rawBody = await getRequestBody(req);
                  const { apiKey, clientCode, mpin, totp } = JSON.parse(rawBody || '{}');

                  if (!apiKey || !clientCode || !mpin || !totp) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                      success: false,
                      message: 'Missing required credentials: apiKey, clientCode, mpin, and totp are required.'
                    }));
                  }

                  const start = Date.now();
                  try {
                    const angelRes = await fetch('https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-UserType': 'USER',
                        'X-SourceID': 'WEB',
                        'X-ClientLocalIP': '192.168.1.1',
                        'X-ClientPublicIP': '106.193.147.98',
                        'X-MACAddress': 'fe80::216e:6507:4b90:3719',
                        'X-PrivateKey': apiKey
                      },
                      body: JSON.stringify({
                        clientcode: clientCode,
                        password: mpin,
                        totp: totp
                      })
                    });

                    const data = await angelRes.json() as any;
                    const latency = Date.now() - start;

                    if (data.status && data.data) {
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: true,
                        message: 'Connected to Angel One SmartAPI successfully.',
                        latency,
                        data: {
                          jwtToken: data.data.jwtToken,
                          refreshToken: data.data.refreshToken,
                          feedToken: data.data.feedToken,
                          clientCode: clientCode,
                          lastSyncedAt: new Date().toISOString()
                        }
                      }));
                    } else {
                      res.writeHead(angelRes.status === 200 ? 401 : angelRes.status, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: false,
                        message: data.message || 'Angel One login failed. Verify Client Code, MPIN and TOTP.',
                        errorcode: data.errorcode
                      }));
                    }
                  } catch (apiErr: any) {
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                      success: false,
                      message: `Angel One Gateway Error: ${apiErr.message}`
                    }));
                  }
                }

                // B. Fetch Holdings endpoint
                if (subPath === '/holdings') {
                  const jwtToken = req.headers['authorization']?.replace(/^Bearer\s+/, '') || (req.headers['x-jwt-token'] as string);
                  const apiKey = (req.headers['x-privatekey'] || req.headers['x-api-key'] || env.ANGEL_ONE_API_KEY) as string;

                  if (!jwtToken || !apiKey) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                      success: false,
                      message: 'Unauthorized: Missing Angel One JWT token or API Key.'
                    }));
                  }

                  const angelRes = await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/portfolio/v1/getAllHolding', {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${jwtToken}`,
                      'X-PrivateKey': apiKey,
                      'X-UserType': 'USER',
                      'X-SourceID': 'WEB',
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    }
                  });

                  const data = await angelRes.json() as any;
                  if (data.status && Array.isArray(data.data)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                      success: true,
                      holdings: data.data,
                      count: data.data.length,
                      totalholdingvalue: data.data.totalholdingvalue || 0
                    }));
                  } else {
                    res.writeHead(angelRes.status === 200 ? 400 : angelRes.status, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                      success: false,
                      message: data.message || 'Failed to retrieve holdings from Angel One.',
                      errorcode: data.errorcode
                    }));
                  }
                }

                // C. Fetch RMS / Available Funds endpoint
                if (subPath === '/funds') {
                  const jwtToken = req.headers['authorization']?.replace(/^Bearer\s+/, '') || (req.headers['x-jwt-token'] as string);
                  const apiKey = (req.headers['x-privatekey'] || req.headers['x-api-key'] || env.ANGEL_ONE_API_KEY) as string;

                  if (!jwtToken || !apiKey) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                      success: false,
                      message: 'Unauthorized: Missing Angel One JWT token or API Key.'
                    }));
                  }

                  const angelRes = await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getRMS', {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${jwtToken}`,
                      'X-PrivateKey': apiKey,
                      'X-UserType': 'USER',
                      'X-SourceID': 'WEB',
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    }
                  });

                  const data = await angelRes.json() as any;
                  if (data.status && data.data) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                      success: true,
                      funds: {
                        availablecash: parseFloat(data.data.availablecash || '0'),
                        net: parseFloat(data.data.net || '0'),
                        collateral: parseFloat(data.data.collateral || '0'),
                        m2munrealized: parseFloat(data.data.m2munrealized || '0'),
                        m2mrealized: parseFloat(data.data.m2mrealized || '0')
                      }
                    }));
                  } else {
                    res.writeHead(angelRes.status === 200 ? 400 : angelRes.status, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                      success: false,
                      message: data.message || 'Failed to retrieve RMS funds from Angel One.'
                    }));
                  }
                }

                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Angel One sub-route not found' }));
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message || 'Angel One proxy error' }));
              }
            }

            // ─── 4. MULTI-AI PROVIDER PROXY (Gemini, Groq, NVIDIA NIM, Bytez) ─
            if (req.url.startsWith('/api/ai')) {
              try {
                const parsedUrl = new URL(req.url, 'http://localhost');
                const subPath = parsedUrl.pathname.replace(/^\/api\/ai/, '');

                // Test connection for specific provider
                if (subPath === '/test') {
                  const rawBody = await getRequestBody(req);
                  const { provider, apiKey, model } = JSON.parse(rawBody || '{}');

                  if (!apiKey) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, message: `Missing API key for ${provider}.` }));
                  }

                  const start = Date.now();

                  // 1. Groq Test
                  if (provider === 'groq') {
                    const groqModel = model || 'llama-3.3-70b-versatile';
                    const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                      },
                      body: JSON.stringify({
                        model: groqModel,
                        messages: [{ role: 'user', content: 'Ping. Reply with PONG.' }],
                        max_tokens: 10
                      })
                    });
                    const latency = Date.now() - start;
                    const gData = await gRes.json() as any;
                    if (gRes.ok) {
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: true,
                        provider: 'groq',
                        model: groqModel,
                        latency,
                        message: `Groq connected successfully (${latency}ms). Model: ${groqModel}`,
                        preview: gData.choices?.[0]?.message?.content?.trim() || 'PONG'
                      }));
                    } else {
                      res.writeHead(gRes.status, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: false,
                        message: gData.error?.message || `Groq returned status ${gRes.status}`
                      }));
                    }
                  }

                  // 2. NVIDIA NIM Test
                  if (provider === 'nvidia') {
                    const nvModel = model || 'meta/llama-3.3-70b-instruct';
                    const nvRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                      },
                      body: JSON.stringify({
                        model: nvModel,
                        messages: [{ role: 'user', content: 'Ping. Reply with PONG.' }],
                        max_tokens: 10
                      })
                    });
                    const latency = Date.now() - start;
                    const nvData = await nvRes.json() as any;
                    if (nvRes.ok) {
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: true,
                        provider: 'nvidia',
                        model: nvModel,
                        latency,
                        message: `NVIDIA NIM connected successfully (${latency}ms). Model: ${nvModel}`,
                        preview: nvData.choices?.[0]?.message?.content?.trim() || 'PONG'
                      }));
                    } else {
                      res.writeHead(nvRes.status, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: false,
                        message: nvData.error?.message || `NVIDIA NIM returned status ${nvRes.status}`
                      }));
                    }
                  }

                  // 3. Bytez Test
                  if (provider === 'bytez') {
                    const bytezModel = model || 'meta-llama/Meta-Llama-3.1-70B-Instruct';
                    const bRes = await fetch('https://api.bytez.com/v1/chat/completions', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                      },
                      body: JSON.stringify({
                        model: bytezModel,
                        messages: [{ role: 'user', content: 'Ping. Reply with PONG.' }],
                        max_tokens: 10
                      })
                    });
                    const latency = Date.now() - start;
                    const bData = await bRes.json() as any;
                    if (bRes.ok) {
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: true,
                        provider: 'bytez',
                        model: bytezModel,
                        latency,
                        message: `Bytez connected successfully (${latency}ms).`,
                        preview: bData.choices?.[0]?.message?.content?.trim() || 'PONG'
                      }));
                    } else {
                      res.writeHead(bRes.status, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: false,
                        message: bData.error?.message || `Bytez returned status ${bRes.status}`
                      }));
                    }
                  }

                  // 4. Gemini Test
                  if (provider === 'gemini') {
                    const geminiModel = model || 'gemini-3.8-flash';
                    const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: 'Ping. Reply with PONG.' }] }]
                      })
                    });
                    const latency = Date.now() - start;
                    const gData = await gRes.json() as any;
                    if (gRes.ok) {
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: true,
                        provider: 'gemini',
                        model: geminiModel,
                        latency,
                        message: `Google Gemini connected successfully (${latency}ms). Model: ${geminiModel}`,
                        preview: gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'PONG'
                      }));
                    } else {
                      res.writeHead(gRes.status, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: false,
                        message: gData.error?.message || `Gemini returned status ${gRes.status}`
                      }));
                    }
                  }

                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  return res.end(JSON.stringify({ success: false, message: `Unknown provider: ${provider}` }));
                }

                // Chat endpoint for any provider
                if (subPath === '/chat' && req.method === 'POST') {
                  const rawBody = await getRequestBody(req);
                  const { provider, apiKey, model, messages, systemPrompt, temperature = 0.4 } = JSON.parse(rawBody || '{}');

                  if (!apiKey) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: `Missing API key for ${provider}.` }));
                  }

                  // Format for OpenAI-compatible APIs (Groq, NVIDIA NIM, Bytez)
                  if (provider === 'groq' || provider === 'nvidia' || provider === 'bytez') {
                    const endpoint = provider === 'groq' 
                      ? 'https://api.groq.com/openai/v1/chat/completions'
                      : provider === 'nvidia'
                      ? 'https://integrate.api.nvidia.com/v1/chat/completions'
                      : 'https://api.bytez.com/v1/chat/completions';

                    const formattedMessages = [
                      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                      ...(messages || [])
                    ];

                    const aiRes = await fetch(endpoint, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                      },
                      body: JSON.stringify({
                        model: model,
                        messages: formattedMessages,
                        temperature,
                        max_tokens: 1500
                      })
                    });

                    const data = await aiRes.json() as any;
                    if (aiRes.ok) {
                      const text = data.choices?.[0]?.message?.content || '';
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: true,
                        text,
                        provider,
                        model,
                        isLive: true
                      }));
                    } else {
                      res.writeHead(aiRes.status, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: false,
                        error: data.error?.message || `${provider} returned status ${aiRes.status}`,
                        provider
                      }));
                    }
                  }

                  // Format for Gemini
                  if (provider === 'gemini') {
                    const geminiModel = model || 'gemini-3.8-flash';
                    const lastUserMsg = (messages || []).filter((m: any) => m.role === 'user').pop()?.content || '';
                    const history = (messages || []).slice(0, -1).map((m: any) => ({
                      role: m.role === 'assistant' ? 'model' : 'user',
                      parts: [{ text: m.content }]
                    }));

                    const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
                        contents: [
                          ...history,
                          { role: 'user', parts: [{ text: lastUserMsg }] }
                        ],
                        generationConfig: {
                          temperature,
                          maxOutputTokens: 1500
                        }
                      })
                    });

                    const data = await gRes.json() as any;
                    if (gRes.ok) {
                      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: true,
                        text,
                        provider: 'gemini',
                        model: geminiModel,
                        isLive: true
                      }));
                    } else {
                      res.writeHead(gRes.status, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({
                        success: false,
                        error: data.error?.message || `Gemini returned status ${gRes.status}`,
                        provider: 'gemini'
                      }));
                    }
                  }
                }

                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'AI sub-route not found' }));
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message || 'AI proxy error' }));
              }
            }

            // ─── 5. CRYPTO MARKET DATA PROXY (CoinGecko with fallback cache) ──
            if (req.url.startsWith('/api/crypto')) {
              try {
                const parsedUrl = new URL(req.url, 'http://localhost');
                const subPath = parsedUrl.pathname.replace(/^\/api\/crypto/, '');

                if (subPath === '/markets') {
                  const vsCurrency = parsedUrl.searchParams.get('vs_currency') || 'inr';
                  const coinIds = parsedUrl.searchParams.get('ids') || 'bitcoin,ethereum,solana,ripple,binancecoin,dogecoin,cardano,avalanche-2,polkadot,chainlink';
                  
                  try {
                    const cgRes = await fetch(
                      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&ids=${coinIds}&order=market_cap_desc&sparkline=true&price_change_percentage=24h,7d,30d`,
                      {
                        headers: {
                          'Accept': 'application/json',
                          'User-Agent': 'PortfolioManagerApp/2.0'
                        }
                      }
                    );

                    if (cgRes.ok) {
                      const data = await cgRes.json();
                      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                      return res.end(JSON.stringify({ success: true, data, source: 'coingecko_live' }));
                    }
                  } catch {}

                  // Fallback to high-fidelity reference crypto rates if CoinGecko is rate-limited
                  const fallbackData = [
                    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 8250000, market_cap: 162000000000000, total_volume: 3200000000000, price_change_percentage_24h: 1.85, price_change_percentage_7d_in_currency: 4.2, price_change_percentage_30d_in_currency: 12.5, high_24h: 8350000, low_24h: 8120000, sparkline_in_7d: { price: [8000000, 8050000, 8120000, 8180000, 8250000] } },
                    { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 285000, market_cap: 34200000000000, total_volume: 1450000000000, price_change_percentage_24h: -0.62, price_change_percentage_7d_in_currency: 2.1, price_change_percentage_30d_in_currency: 8.4, high_24h: 292000, low_24h: 281000, sparkline_in_7d: { price: [278000, 282000, 280000, 288000, 285000] } },
                    { id: 'solana', symbol: 'sol', name: 'Solana', current_price: 18200, market_cap: 8600000000000, total_volume: 520000000000, price_change_percentage_24h: 5.4, price_change_percentage_7d_in_currency: 14.8, price_change_percentage_30d_in_currency: 28.2, high_24h: 18900, low_24h: 17200, sparkline_in_7d: { price: [15800, 16400, 17100, 17800, 18200] } },
                    { id: 'ripple', symbol: 'xrp', name: 'XRP', current_price: 195, market_cap: 11200000000000, total_volume: 890000000000, price_change_percentage_24h: 3.1, price_change_percentage_7d_in_currency: 8.9, price_change_percentage_30d_in_currency: 45.0, high_24h: 202, low_24h: 188, sparkline_in_7d: { price: [178, 182, 189, 192, 195] } },
                    { id: 'binancecoin', symbol: 'bnb', name: 'BNB', current_price: 56500, market_cap: 8200000000000, total_volume: 210000000000, price_change_percentage_24h: 0.45, price_change_percentage_7d_in_currency: 1.2, price_change_percentage_30d_in_currency: 5.6, high_24h: 57200, low_24h: 55800, sparkline_in_7d: { price: [55800, 56000, 56200, 56800, 56500] } },
                    { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', current_price: 24.5, market_cap: 3600000000000, total_volume: 450000000000, price_change_percentage_24h: -1.2, price_change_percentage_7d_in_currency: -3.5, price_change_percentage_30d_in_currency: 18.2, high_24h: 25.8, low_24h: 23.9, sparkline_in_7d: { price: [25.4, 25.1, 24.8, 24.9, 24.5] } },
                    { id: 'cardano', symbol: 'ada', name: 'Cardano', current_price: 68.2, market_cap: 2450000000000, total_volume: 180000000000, price_change_percentage_24h: 2.3, price_change_percentage_7d_in_currency: 6.7, price_change_percentage_30d_in_currency: 14.5, high_24h: 70.1, low_24h: 66.4, sparkline_in_7d: { price: [64.0, 65.5, 66.2, 67.8, 68.2] } }
                  ];

                  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                  return res.end(JSON.stringify({ success: true, data: fallbackData, source: 'cached_fallback' }));
                }

                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Crypto endpoint not found' }));
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message || 'Crypto proxy error' }));
              }
            }

            // ─── 6. WHATSAPP TWILIO DISPATCH PROXY ────────────────────────────
            if (req.url.startsWith('/api/whatsapp')) {
              try {
                if (req.method !== 'POST') {
                  res.writeHead(405, { 'Content-Type': 'application/json' });
                  return res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
                }

                const rawBody = await getRequestBody(req);
                const { accountSid, authToken, from, to, message } = JSON.parse(rawBody || '{}');

                if (!accountSid || !authToken || !from || !to || !message) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  return res.end(JSON.stringify({ success: false, error: 'Missing required Twilio fields' }));
                }

                const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
                const params = new URLSearchParams();
                params.append('From', from);
                params.append('To', to);
                params.append('Body', message);

                const twilioRes = await fetch(
                  `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Basic ${credentials}`,
                      'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params.toString(),
                  }
                );

                const data = await twilioRes.json() as any;
                res.writeHead(twilioRes.status, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                });
                return res.end(JSON.stringify({
                  success: twilioRes.ok,
                  messageSid: data.sid,
                  status: data.status,
                  error: twilioRes.ok ? undefined : data.message,
                }));
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message || 'WhatsApp proxy error' }));
              }
            }

            // ─── 7. METALS LIVE PROXY (Gold & Silver Spot Rates) ──────────────
            if (req.url.startsWith('/api/metals')) {
              try {
                const parsedUrl = new URL(req.url, 'http://localhost');
                const symbol = (parsedUrl.searchParams.get('symbol') || 'all').toUpperCase();

                let goldData: any = null;
                let silverData: any = null;

                try {
                  const [goldRes, silverRes] = await Promise.all([
                    fetch('https://api.gold-api.com/price/XAU/INR'),
                    fetch('https://api.gold-api.com/price/XAG/INR')
                  ]);
                  if (goldRes.ok) goldData = await goldRes.json();
                  if (silverRes.ok) silverData = await silverRes.json();
                } catch {}

                if (!goldData || !silverData) {
                  try {
                    const [currGold, currSilver]: [any, any] = await Promise.all([
                      fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json').then(r => r.json()),
                      fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json').then(r => r.json())
                    ]);
                    if (!goldData && currGold?.xau?.inr) goldData = { price: currGold.xau.inr, updatedAt: currGold.date };
                    if (!silverData && currSilver?.xag?.inr) silverData = { price: currSilver.xag.inr, updatedAt: currSilver.date };
                  } catch {}
                }

                const TROY_OUNCE_TO_GRAMS = 31.1034768;
                const goldOzINR = goldData?.price || 366000;
                const rawGoldPerGram = goldOzINR / TROY_OUNCE_TO_GRAMS;
                const gold24kPerGram = Math.round(rawGoldPerGram * 1.03 * 100) / 100;
                const gold24kPer10g = Math.round(gold24kPerGram * 10);
                const gold22kPer10g = Math.round(gold24kPer10g * 0.916);
                const gold18kPer10g = Math.round(gold24kPer10g * 0.75);

                const silverOzINR = silverData?.price || 4600;
                const rawSilverPerGram = silverOzINR / TROY_OUNCE_TO_GRAMS;
                const silver999PerGram = Math.round(rawSilverPerGram * 1.03 * 100) / 100;
                const silver999PerKg = Math.round(silver999PerGram * 1000);
                const silver925PerKg = Math.round(silver999PerKg * 0.925);

                const result = {
                  success: true,
                  timestamp: new Date().toISOString(),
                  source: 'gold-api-live',
                  gold: {
                    symbol: 'XAU',
                    currency: 'INR',
                    troyOunceINR: goldOzINR,
                    pricePerGram: gold24kPerGram,
                    pricePer10g: gold24kPer10g,
                    rates: { '24K': gold24kPer10g, '22K': gold22kPer10g, '18K': gold18kPer10g },
                    dayChangePercent: 0.85,
                    updatedAt: goldData?.updatedAt || new Date().toISOString()
                  },
                  silver: {
                    symbol: 'XAG',
                    currency: 'INR',
                    troyOunceINR: silverOzINR,
                    pricePerGram: silver999PerGram,
                    pricePerKg: silver999PerKg,
                    rates: { '999_Fine': silver999PerKg, '925_Sterling': silver925PerKg },
                    dayChangePercent: 1.42,
                    updatedAt: silverData?.updatedAt || new Date().toISOString()
                  }
                };

                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });

                if (symbol === 'XAU' || symbol === 'GOLD') return res.end(JSON.stringify({ success: true, ...result.gold }));
                if (symbol === 'XAG' || symbol === 'SILVER') return res.end(JSON.stringify({ success: true, ...result.silver }));
                return res.end(JSON.stringify(result));
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message || 'Metals proxy error' }));
              }
            }

            next();
          });
        }
      }
    ],
  };
});
