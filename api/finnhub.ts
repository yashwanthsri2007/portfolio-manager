// api/finnhub.ts - Vercel Serverless Function
export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-finnhub-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const clientToken = req.headers['x-finnhub-token'] as string;
    const token = clientToken || parsedUrl.searchParams.get('token') || process.env.FINNHUB_API_KEY || process.env.VITE_FINNHUB_API_KEY || '';

    const path = parsedUrl.pathname.replace(/^\/api\/finnhub/, '');

    if (path === '/test-connection' || parsedUrl.searchParams.get('action') === 'test-connection') {
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'No Finnhub API key found. Enter it in Settings or add FINNHUB_API_KEY in environment variables.'
        });
      }

      const start = Date.now();
      const testRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${token}`);
      const latency = Date.now() - start;

      if (testRes.status === 401 || testRes.status === 403) {
        return res.status(401).json({
          success: false,
          message: 'Invalid Finnhub API Key. Authentication failed (401/403).'
        });
      }

      if (testRes.status === 429) {
        return res.status(429).json({
          success: false,
          message: 'Finnhub API Rate Limit exceeded (30 req/min for free tier).'
        });
      }

      if (testRes.ok) {
        const data = await testRes.json() as any;
        if (data && typeof data.c === 'number' && data.c > 0) {
          return res.status(200).json({
            success: true,
            message: `Connected to Finnhub successfully (${latency}ms). Live AAPL: $${data.c}`,
            latency
          });
        }
      }

      return res.status(testRes.status).json({
        success: false,
        message: `Finnhub returned HTTP ${testRes.status}: Unable to fetch quote data.`
      });
    }

    // Proxy request to Finnhub
    parsedUrl.searchParams.set('token', token);
    const targetUrl = `https://finnhub.io/api/v1${path}?${parsedUrl.searchParams.toString()}`;

    const proxyRes = await fetch(targetUrl);
    const data = await proxyRes.text();

    res.status(proxyRes.status);
    res.setHeader('Content-Type', proxyRes.headers.get('content-type') || 'application/json');
    return res.send(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Finnhub serverless proxy error' });
  }
}
