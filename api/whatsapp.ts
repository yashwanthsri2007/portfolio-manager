// api/whatsapp.ts - Vercel Serverless Function for Twilio WhatsApp Dispatch
export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const { accountSid, authToken, from, to, message } = req.body || {};

    if (!accountSid || !authToken || !from || !to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accountSid, authToken, from, to, and message are required.'
      });
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

    if (twilioRes.ok) {
      return res.status(200).json({
        success: true,
        messageSid: data.sid,
        status: data.status,
      });
    } else {
      return res.status(twilioRes.status).json({
        success: false,
        error: data.message || `Twilio API returned status ${twilioRes.status}`,
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'WhatsApp proxy dispatch error',
    });
  }
}
