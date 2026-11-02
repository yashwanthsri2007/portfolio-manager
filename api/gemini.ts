// api/gemini.ts - Vercel Serverless Function
export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const clientKey = req.headers['x-gemini-key'] as string;
    const token = clientKey || parsedUrl.searchParams.get('key') || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

    const path = parsedUrl.pathname.replace(/^\/api\/gemini/, '');

    // ─── 1. Test Connection endpoint ──────────────────────────────────────────
    if (path === '/test-connection' || parsedUrl.searchParams.get('action') === 'test-connection') {
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'No Google Gemini API key found. Enter it in Settings or configure GEMINI_API_KEY in environment variables.'
        });
      }

      const start = Date.now();
      const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${token}`;

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
        return res.status(400).json({
          success: false,
          message: data.error?.message || 'Invalid Gemini API Key or malformed request.'
        });
      }

      if (geminiRes.status === 401 || geminiRes.status === 403) {
        return res.status(401).json({
          success: false,
          message: 'Invalid Gemini API Key. Authentication failed (401/403).'
        });
      }

      if (geminiRes.status === 429) {
        return res.status(429).json({
          success: false,
          message: 'Gemini API Rate Limit / Quota exceeded (HTTP 429). Check your Google AI Studio plan.'
        });
      }

      if (geminiRes.ok) {
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'PONG';
        return res.status(200).json({
          success: true,
          message: `Connected to Google Gemini successfully (${latency}ms). Model: gemini-2.5-flash`,
          latency,
          model: 'gemini-2.5-flash',
          preview: reply
        });
      }

      return res.status(geminiRes.status).json({
        success: false,
        message: data.error?.message || `Gemini returned HTTP ${geminiRes.status}`
      });
    }

    // ─── 2. Generate / Inference endpoint ─────────────────────────────────────
    if (path === '/generate' || req.method === 'POST') {
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Missing Gemini API Key. Configure your key in Settings or .env.'
        });
      }

      const { prompt, systemInstruction, contextText, model = 'gemini-2.5-flash' } = req.body || {};

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
        return res.status(200).json({
          success: true,
          text,
          model,
          isLive: true
        });
      } else {
        return res.status(geminiRes.status).json({
          success: false,
          error: geminiData.error?.message || `Gemini API returned status ${geminiRes.status}`
        });
      }
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gemini serverless function error' });
  }
}
