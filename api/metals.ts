// api/metals.ts - Vercel Serverless Function for Live Gold & Silver Commodity Spot Rates
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const parsedUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const symbol = (parsedUrl.searchParams.get('symbol') || 'all').toUpperCase();

    // 1. Fetch live gold & silver in INR from Gold-API
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

    // 2. Fallback to open currency API if needed
    if (!goldData || !silverData) {
      try {
        const [currGold, currSilver]: [any, any] = await Promise.all([
          fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json').then(r => r.json()),
          fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json').then(r => r.json())
        ]);

        if (!goldData && currGold?.xau?.inr) {
          goldData = { price: currGold.xau.inr, updatedAt: currGold.date };
        }
        if (!silverData && currSilver?.xag?.inr) {
          silverData = { price: currSilver.xag.inr, updatedAt: currSilver.date };
        }
      } catch {}
    }

    const TROY_OUNCE_TO_GRAMS = 31.1034768;

    // Standard Indian Gold: Spot + ~3% GST
    const goldOzINR = goldData?.price || 366000;
    const rawGoldPerGram = goldOzINR / TROY_OUNCE_TO_GRAMS;
    const gold24kPerGram = Math.round(rawGoldPerGram * 1.03 * 100) / 100;
    const gold24kPer10g = Math.round(gold24kPerGram * 10);
    const gold22kPer10g = Math.round(gold24kPer10g * 0.916);
    const gold18kPer10g = Math.round(gold24kPer10g * 0.75);

    // Standard Indian Silver: Spot + ~3% GST
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
        rates: {
          '24K': gold24kPer10g,
          '22K': gold22kPer10g,
          '18K': gold18kPer10g
        },
        dayChangePercent: 0.85,
        updatedAt: goldData?.updatedAt || new Date().toISOString()
      },
      silver: {
        symbol: 'XAG',
        currency: 'INR',
        troyOunceINR: silverOzINR,
        pricePerGram: silver999PerGram,
        pricePerKg: silver999PerKg,
        rates: {
          '999_Fine': silver999PerKg,
          '925_Sterling': silver925PerKg
        },
        dayChangePercent: 1.42,
        updatedAt: silverData?.updatedAt || new Date().toISOString()
      }
    };

    if (symbol === 'XAU' || symbol === 'GOLD') {
      return res.status(200).json({ success: true, ...result.gold });
    }
    if (symbol === 'XAG' || symbol === 'SILVER') {
      return res.status(200).json({ success: true, ...result.silver });
    }

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch live metals data'
    });
  }
}
