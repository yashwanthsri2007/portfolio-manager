// api/ai.ts - Vercel Serverless Function for Multi-AI (Gemini, Groq, NVIDIA NIM, Bytez)
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const subPath = parsedUrl.pathname.replace(/^\/api\/ai/, '') || parsedUrl.searchParams.get('action') || '';

    // 1. TEST CONNECTION
    if (subPath === '/test' || subPath === 'test') {
      const { provider, apiKey, model } = req.body || {};

      if (!apiKey) {
        return res.status(400).json({ success: false, message: `Missing API key for ${provider}.` });
      }

      const start = Date.now();

      if (provider === 'groq') {
        const groqModel = model || 'llama-3.3-70b-versatile';
        const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: groqModel, messages: [{ role: 'user', content: 'Ping. Reply PONG.' }], max_tokens: 10 })
        });
        const latency = Date.now() - start;
        const gData = await gRes.json() as any;
        if (gRes.ok) {
          return res.status(200).json({
            success: true,
            provider: 'groq',
            model: groqModel,
            latency,
            message: `Groq connected successfully (${latency}ms). Model: ${groqModel}`,
            preview: gData.choices?.[0]?.message?.content?.trim() || 'PONG'
          });
        }
        return res.status(gRes.status).json({ success: false, message: gData.error?.message || 'Groq connection failed' });
      }

      if (provider === 'nvidia') {
        const nvModel = model || 'meta/llama-3.3-70b-instruct';
        const nvRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: nvModel, messages: [{ role: 'user', content: 'Ping. Reply PONG.' }], max_tokens: 10 })
        });
        const latency = Date.now() - start;
        const nvData = await nvRes.json() as any;
        if (nvRes.ok) {
          return res.status(200).json({
            success: true,
            provider: 'nvidia',
            model: nvModel,
            latency,
            message: `NVIDIA NIM connected successfully (${latency}ms). Model: ${nvModel}`,
            preview: nvData.choices?.[0]?.message?.content?.trim() || 'PONG'
          });
        }
        return res.status(nvRes.status).json({ success: false, message: nvData.error?.message || 'NVIDIA NIM connection failed' });
      }

      if (provider === 'bytez') {
        const bytezModel = model || 'meta-llama/Meta-Llama-3.1-70B-Instruct';
        const bRes = await fetch('https://api.bytez.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: bytezModel, messages: [{ role: 'user', content: 'Ping. Reply PONG.' }], max_tokens: 10 })
        });
        const latency = Date.now() - start;
        const bData = await bRes.json() as any;
        if (bRes.ok) {
          return res.status(200).json({
            success: true,
            provider: 'bytez',
            model: bytezModel,
            latency,
            message: `Bytez connected successfully (${latency}ms).`,
            preview: bData.choices?.[0]?.message?.content?.trim() || 'PONG'
          });
        }
        return res.status(bRes.status).json({ success: false, message: bData.error?.message || 'Bytez connection failed' });
      }

      if (provider === 'gemini') {
        const geminiModel = model || 'gemini-3.8-flash';
        const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Ping. Reply with PONG.' }] }] })
        });
        const latency = Date.now() - start;
        const gData = await gRes.json() as any;
        if (gRes.ok) {
          return res.status(200).json({
            success: true,
            provider: 'gemini',
            model: geminiModel,
            latency,
            message: `Google Gemini connected successfully (${latency}ms). Model: ${geminiModel}`,
            preview: gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'PONG'
          });
        }
        return res.status(gRes.status).json({ success: false, message: gData.error?.message || 'Gemini connection failed' });
      }

      return res.status(400).json({ success: false, message: `Unknown provider: ${provider}` });
    }

    // 2. CHAT INFERENCE
    if (subPath === '/chat' || req.method === 'POST') {
      const { provider, apiKey, model, messages, systemPrompt, temperature = 0.4 } = req.body || {};

      if (!apiKey) {
        return res.status(400).json({ success: false, error: `Missing API key for ${provider}.` });
      }

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
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: formattedMessages, temperature, max_tokens: 1500 })
        });

        const data = await aiRes.json() as any;
        if (aiRes.ok) {
          return res.status(200).json({
            success: true,
            text: data.choices?.[0]?.message?.content || '',
            provider,
            model,
            isLive: true
          });
        }
        return res.status(aiRes.status).json({ success: false, error: data.error?.message || `${provider} failed`, provider });
      }

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
            contents: [...history, { role: 'user', parts: [{ text: lastUserMsg }] }],
            generationConfig: { temperature, maxOutputTokens: 1500 }
          })
        });

        const data = await gRes.json() as any;
        if (gRes.ok) {
          return res.status(200).json({
            success: true,
            text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
            provider: 'gemini',
            model: geminiModel,
            isLive: true
          });
        }
        return res.status(gRes.status).json({ success: false, error: data.error?.message || 'Gemini error', provider: 'gemini' });
      }
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'AI proxy error' });
  }
}
