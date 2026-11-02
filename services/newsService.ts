import { NewsItem, Holding } from '../types';

export function getMarketNews(holdings: Holding[]): NewsItem[] {
  const symbols = holdings.map(h => h.symbol.toUpperCase());
  
  const newsDatabase: NewsItem[] = [
    {
      id: 'news-1',
      headline: 'Reliance Industries Expands Green Energy & Solar Gigafactory Footprint',
      summary: 'RIL announces accelerated deployment of 20GW solar power capacity and green hydrogen electrolyzers in Gujarat.',
      source: 'Bloomberg Financial',
      time: '2 hours ago',
      relatedSymbol: 'RELIANCE',
      sentiment: 'bullish',
      confidence: 0.92
    },
    {
      id: 'news-2',
      headline: 'Infosys Signs $1.2B Multi-Year Cloud Transformation Deal with European Retail Giant',
      summary: 'Infosys secures major enterprise deal boosting order book visibility for FY27.',
      source: 'Economic Times',
      time: '4 hours ago',
      relatedSymbol: 'INFY',
      sentiment: 'bullish',
      confidence: 0.88
    },
    {
      id: 'news-3',
      headline: 'RBI Maintains Benchmark Repo Rate; HDFC Bank & Private Lenders See Margin Stability',
      summary: 'Central bank monetary policy stance remains neutral, aiding Net Interest Margins (NIM) for large banks.',
      source: 'Reuters',
      time: '5 hours ago',
      relatedSymbol: 'HDFCBANK',
      sentiment: 'neutral',
      confidence: 0.75
    },
    {
      id: 'news-4',
      headline: 'Global Semiconductor Shortage Signals Caution for Automotive Supply Chains',
      summary: 'Passenger vehicle makers face potential production throttling due to chip supply constraints.',
      source: 'Financial Times',
      time: '7 hours ago',
      relatedSymbol: 'TATAMOTORS',
      sentiment: 'bearish',
      confidence: 0.81
    },
    {
      id: 'news-5',
      headline: 'Gold Surges Near Record Highs Amid Central Bank Accumulation & Rate Cut Expectations',
      summary: 'Bullion gains strength as global central banks continue net purchases for reserves.',
      source: 'MarketWatch',
      time: '1 hour ago',
      relatedSymbol: 'GOLD-24K-BAR',
      sentiment: 'bullish',
      confidence: 0.95
    },
    {
      id: 'news-6',
      headline: 'US IT Spending Growth Forecast Reduced for H2 Amid Enterprise Budget Constraints',
      summary: 'Gartner lowers global IT services growth estimate to 4.2%, creating near-term headwinds for software exporters.',
      source: 'TechCrunch Financial',
      time: '8 hours ago',
      relatedSymbol: 'TCS',
      sentiment: 'bearish',
      confidence: 0.79
    },
    {
      id: 'news-7',
      headline: 'NVIDIA Unveils Next-Gen AI Infrastructure Architecture with Record Demand',
      summary: 'Blackwell chip architecture production ramps up with strong hyperscaler pre-orders.',
      source: 'CNBC',
      time: '3 hours ago',
      relatedSymbol: 'NVDA',
      sentiment: 'bullish',
      confidence: 0.96
    }
  ];

  // Return news items filtered or prioritized by user holdings
  if (symbols.length === 0) return newsDatabase;

  const userNews = newsDatabase.filter(n => 
    !n.relatedSymbol || symbols.includes(n.relatedSymbol.toUpperCase())
  );

  return userNews.length > 0 ? userNews : newsDatabase;
}
