// api/angelone.ts - Vercel Serverless Function for Angel One SmartAPI
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-jwt-token, x-privatekey, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const subPath = parsedUrl.pathname.replace(/^\/api\/angelone/, '') || parsedUrl.searchParams.get('action') || '';

    // 1. LOGIN
    if (subPath === '/login' || subPath === 'login') {
      const { apiKey, clientCode, mpin, totp } = req.body || {};

      if (!apiKey || !clientCode || !mpin || !totp) {
        return res.status(400).json({
          success: false,
          message: 'Missing required credentials: apiKey, clientCode, mpin, and totp.'
        });
      }

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
      if (data.status && data.data) {
        return res.status(200).json({
          success: true,
          message: 'Connected to Angel One SmartAPI successfully.',
          data: {
            jwtToken: data.data.jwtToken,
            refreshToken: data.data.refreshToken,
            feedToken: data.data.feedToken,
            clientCode: clientCode,
            lastSyncedAt: new Date().toISOString()
          }
        });
      } else {
        return res.status(angelRes.status === 200 ? 401 : angelRes.status).json({
          success: false,
          message: data.message || 'Angel One authentication failed. Verify Client Code, MPIN and TOTP.'
        });
      }
    }

    // 2. HOLDINGS
    if (subPath === '/holdings' || subPath === 'holdings') {
      const jwtToken = req.headers['authorization']?.replace(/^Bearer\s+/, '') || (req.headers['x-jwt-token'] as string);
      const apiKey = (req.headers['x-privatekey'] || req.headers['x-api-key'] || process.env.ANGEL_ONE_API_KEY) as string;

      if (!jwtToken || !apiKey) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing Angel One JWT token or API Key.' });
      }

      const angelRes = await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/portfolio/v1/getAllHolding', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'X-PrivateKey': apiKey,
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'Content-Type': 'application/json'
        }
      });

      const data = await angelRes.json() as any;
      if (data.status && Array.isArray(data.data)) {
        return res.status(200).json({
          success: true,
          holdings: data.data,
          count: data.data.length
        });
      } else {
        return res.status(angelRes.status === 200 ? 400 : angelRes.status).json({
          success: false,
          message: data.message || 'Failed to retrieve holdings from Angel One.'
        });
      }
    }

    // 3. RMS FUNDS
    if (subPath === '/funds' || subPath === 'funds') {
      const jwtToken = req.headers['authorization']?.replace(/^Bearer\s+/, '') || (req.headers['x-jwt-token'] as string);
      const apiKey = (req.headers['x-privatekey'] || req.headers['x-api-key'] || process.env.ANGEL_ONE_API_KEY) as string;

      if (!jwtToken || !apiKey) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing Angel One JWT token or API Key.' });
      }

      const angelRes = await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getRMS', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'X-PrivateKey': apiKey,
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'Content-Type': 'application/json'
        }
      });

      const data = await angelRes.json() as any;
      if (data.status && data.data) {
        return res.status(200).json({
          success: true,
          funds: {
            availablecash: parseFloat(data.data.availablecash || '0'),
            net: parseFloat(data.data.net || '0'),
            collateral: parseFloat(data.data.collateral || '0')
          }
        });
      } else {
        return res.status(angelRes.status === 200 ? 400 : angelRes.status).json({
          success: false,
          message: data.message || 'Failed to retrieve RMS funds.'
        });
      }
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Angel One proxy error' });
  }
}
