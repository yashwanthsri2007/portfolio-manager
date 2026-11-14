// src/services/ipoService.ts
// IPO Data Service - provides IPO data with realistic mock fallback

export interface IPOEntry {
  id: string;
  companyName: string;
  symbol: string;
  issueSize: number; // ₹ Crores
  issuePrice: string; // price range e.g. "₹900-₹950"
  issuePriceLow: number;
  issuePriceHigh: number;
  openDate: string;
  closeDate: string;
  allotmentDate: string;
  listingDate: string;
  listingPrice?: number;
  listingGain?: number; // % gain/loss from issue price
  subscriptionStatus: string; // e.g. "147.26x" or "Upcoming"
  retailSubscription?: number; // times
  niiSubscription?: number; // times
  qibSubscription?: number; // times
  gmp: number; // Grey Market Premium in ₹
  gmpPercent: number;
  status: 'upcoming' | 'open' | 'allotment' | 'listed' | 'closed';
  category: 'mainboard' | 'sme';
  sector: string;
  companyDescription: string;
  promoterHolding: number; // %
  retailQuota: number; // %
  qibQuota: number; // %
  niiQuota: number; // %
  // Financials (last 3 years)
  financials: {
    year: string;
    revenue: number; // ₹ Cr
    profit: number;  // ₹ Cr
    eps: number;
  }[];
  gmpHistory: { day: string; gmp: number }[]; // last 7 days
}

const MOCK_IPOS: IPOEntry[] = [
  {
    id: 'swiggy-2024',
    companyName: 'Swiggy Limited',
    symbol: 'SWIGGY',
    issueSize: 11327,
    issuePrice: '₹371-₹390',
    issuePriceLow: 371,
    issuePriceHigh: 390,
    openDate: '2024-11-06',
    closeDate: '2024-11-08',
    allotmentDate: '2024-11-11',
    listingDate: '2024-11-13',
    listingPrice: 420,
    listingGain: 7.69,
    subscriptionStatus: '3.59x',
    retailSubscription: 1.14,
    niiSubscription: 0.41,
    qibSubscription: 6.02,
    gmp: 25,
    gmpPercent: 6.41,
    status: 'listed',
    category: 'mainboard',
    sector: 'Food Delivery / Technology',
    companyDescription:
      'Swiggy is India\'s leading on-demand food delivery platform connecting consumers with restaurants. It operates Swiggy Instamart for groceries and Swiggy Genie for package delivery.',
    promoterHolding: 0,
    retailQuota: 35,
    qibQuota: 50,
    niiQuota: 15,
    financials: [
      { year: 'FY22', revenue: 5705, profit: -3629, eps: -6.52 },
      { year: 'FY23', revenue: 8265, profit: -4179, eps: -7.52 },
      { year: 'FY24', revenue: 11247, profit: -2350, eps: -4.23 },
    ],
    gmpHistory: [
      { day: 'Day 1', gmp: 55 },
      { day: 'Day 2', gmp: 48 },
      { day: 'Day 3', gmp: 42 },
      { day: 'Day 4', gmp: 38 },
      { day: 'Day 5', gmp: 32 },
      { day: 'Day 6', gmp: 28 },
      { day: 'Day 7', gmp: 25 },
    ],
  },
  {
    id: 'hyundai-india-2024',
    companyName: 'Hyundai Motor India Limited',
    symbol: 'HYUNDAI',
    issueSize: 27870,
    issuePrice: '₹1865-₹1960',
    issuePriceLow: 1865,
    issuePriceHigh: 1960,
    openDate: '2024-10-15',
    closeDate: '2024-10-17',
    allotmentDate: '2024-10-18',
    listingDate: '2024-10-22',
    listingPrice: 1931,
    listingGain: -1.48,
    subscriptionStatus: '2.37x',
    retailSubscription: 0.5,
    niiSubscription: 0.6,
    qibSubscription: 6.97,
    gmp: -30,
    gmpPercent: -1.53,
    status: 'listed',
    category: 'mainboard',
    sector: 'Automobile',
    companyDescription:
      'Hyundai Motor India is the second largest car manufacturer in India. It sells passenger vehicles under the Hyundai brand and exports to over 150 countries from its Indian plants.',
    promoterHolding: 82.5,
    retailQuota: 35,
    qibQuota: 50,
    niiQuota: 15,
    financials: [
      { year: 'FY22', revenue: 50100, profit: 2900, eps: 36.1 },
      { year: 'FY23', revenue: 61435, profit: 4709, eps: 58.3 },
      { year: 'FY24', revenue: 71302, profit: 6060, eps: 74.4 },
    ],
    gmpHistory: [
      { day: 'Day 1', gmp: 120 },
      { day: 'Day 2', gmp: 90 },
      { day: 'Day 3', gmp: 60 },
      { day: 'Day 4', gmp: 20 },
      { day: 'Day 5', gmp: -10 },
      { day: 'Day 6', gmp: -25 },
      { day: 'Day 7', gmp: -30 },
    ],
  },
  {
    id: 'bajaj-housing-2024',
    companyName: 'Bajaj Housing Finance Limited',
    symbol: 'BAJAJHFL',
    issueSize: 6560,
    issuePrice: '₹66-₹70',
    issuePriceLow: 66,
    issuePriceHigh: 70,
    openDate: '2024-09-09',
    closeDate: '2024-09-11',
    allotmentDate: '2024-09-12',
    listingDate: '2024-09-16',
    listingPrice: 150,
    listingGain: 114.29,
    subscriptionStatus: '64.26x',
    retailSubscription: 7.32,
    niiSubscription: 41.5,
    qibSubscription: 209.36,
    gmp: 95,
    gmpPercent: 135.71,
    status: 'listed',
    category: 'mainboard',
    sector: 'Housing Finance / NBFC',
    companyDescription:
      'Bajaj Housing Finance is a subsidiary of Bajaj Finance, offering home loans, loan against property, and lease rental discounting. It is one of the fastest growing HFCs in India.',
    promoterHolding: 88.75,
    retailQuota: 35,
    qibQuota: 50,
    niiQuota: 15,
    financials: [
      { year: 'FY22', revenue: 3200, profit: 710, eps: 1.1 },
      { year: 'FY23', revenue: 4870, profit: 1258, eps: 1.5 },
      { year: 'FY24', revenue: 7000, profit: 1731, eps: 2.0 },
    ],
    gmpHistory: [
      { day: 'Day 1', gmp: 55 },
      { day: 'Day 2', gmp: 68 },
      { day: 'Day 3', gmp: 80 },
      { day: 'Day 4', gmp: 90 },
      { day: 'Day 5', gmp: 95 },
      { day: 'Day 6', gmp: 92 },
      { day: 'Day 7', gmp: 95 },
    ],
  },
  {
    id: 'ntpc-green-2024',
    companyName: 'NTPC Green Energy Limited',
    symbol: 'NTPCGREEN',
    issueSize: 10000,
    issuePrice: '₹102-₹108',
    issuePriceLow: 102,
    issuePriceHigh: 108,
    openDate: '2024-11-19',
    closeDate: '2024-11-22',
    allotmentDate: '2024-11-25',
    listingDate: '2024-11-27',
    listingPrice: 111,
    listingGain: 2.78,
    subscriptionStatus: '2.55x',
    retailSubscription: 1.75,
    niiSubscription: 0.26,
    qibSubscription: 3.94,
    gmp: 8,
    gmpPercent: 7.41,
    status: 'listed',
    category: 'mainboard',
    sector: 'Renewable Energy',
    companyDescription:
      'NTPC Green Energy is the renewable energy subsidiary of NTPC Limited, one of India\'s largest power companies. It focuses on solar, wind, and green hydrogen projects.',
    promoterHolding: 89.25,
    retailQuota: 35,
    qibQuota: 50,
    niiQuota: 15,
    financials: [
      { year: 'FY22', revenue: 180, profit: 32, eps: 0.03 },
      { year: 'FY23', revenue: 1540, profit: 495, eps: 0.42 },
      { year: 'FY24', revenue: 2000, profit: 530, eps: 0.44 },
    ],
    gmpHistory: [
      { day: 'Day 1', gmp: 15 },
      { day: 'Day 2', gmp: 14 },
      { day: 'Day 3', gmp: 12 },
      { day: 'Day 4', gmp: 10 },
      { day: 'Day 5', gmp: 9 },
      { day: 'Day 6', gmp: 8 },
      { day: 'Day 7', gmp: 8 },
    ],
  },
  {
    id: 'mobikwik-2024',
    companyName: 'One MobiKwik Systems Limited',
    symbol: 'MOBIKWIK',
    issueSize: 572,
    issuePrice: '₹265-₹279',
    issuePriceLow: 265,
    issuePriceHigh: 279,
    openDate: '2024-12-11',
    closeDate: '2024-12-13',
    allotmentDate: '2024-12-16',
    listingDate: '2024-12-18',
    listingPrice: 442,
    listingGain: 58.42,
    subscriptionStatus: '119.78x',
    retailSubscription: 134.74,
    niiSubscription: 109.29,
    qibSubscription: 119.73,
    gmp: 180,
    gmpPercent: 64.52,
    status: 'listed',
    category: 'mainboard',
    sector: 'FinTech / Payments',
    companyDescription:
      'MobiKwik is a leading digital payments and financial services platform in India offering mobile wallets, buy-now-pay-later (BNPL), and insurance products.',
    promoterHolding: 15.2,
    retailQuota: 35,
    qibQuota: 50,
    niiQuota: 15,
    financials: [
      { year: 'FY22', revenue: 310, profit: -128, eps: -4.6 },
      { year: 'FY23', revenue: 539, profit: -84, eps: -3.0 },
      { year: 'FY24', revenue: 875, profit: 14, eps: 0.5 },
    ],
    gmpHistory: [
      { day: 'Day 1', gmp: 95 },
      { day: 'Day 2', gmp: 120 },
      { day: 'Day 3', gmp: 155 },
      { day: 'Day 4', gmp: 170 },
      { day: 'Day 5', gmp: 175 },
      { day: 'Day 6', gmp: 180 },
      { day: 'Day 7', gmp: 180 },
    ],
  },
  {
    id: 'vishal-mega-2025',
    companyName: 'Vishal Mega Mart Limited',
    symbol: 'VISHALMEGA',
    issueSize: 8000,
    issuePrice: '₹74-₹78',
    issuePriceLow: 74,
    issuePriceHigh: 78,
    openDate: '2024-12-11',
    closeDate: '2024-12-13',
    allotmentDate: '2024-12-16',
    listingDate: '2024-12-18',
    listingPrice: 97,
    listingGain: 24.36,
    subscriptionStatus: '27.26x',
    retailSubscription: 11.65,
    niiSubscription: 20.5,
    qibSubscription: 69.82,
    gmp: 22,
    gmpPercent: 28.21,
    status: 'listed',
    category: 'mainboard',
    sector: 'Retail',
    companyDescription:
      'Vishal Mega Mart is one of India\'s fastest-growing retail chains with over 600 stores across Tier 2 and Tier 3 cities, offering value fashion, general merchandise, and FMCG.',
    promoterHolding: 68.4,
    retailQuota: 35,
    qibQuota: 50,
    niiQuota: 15,
    financials: [
      { year: 'FY22', revenue: 5890, profit: 180, eps: 0.26 },
      { year: 'FY23', revenue: 7742, profit: 310, eps: 0.44 },
      { year: 'FY24', revenue: 9212, profit: 462, eps: 0.66 },
    ],
    gmpHistory: [
      { day: 'Day 1', gmp: 10 },
      { day: 'Day 2', gmp: 14 },
      { day: 'Day 3', gmp: 17 },
      { day: 'Day 4', gmp: 20 },
      { day: 'Day 5', gmp: 22 },
      { day: 'Day 6', gmp: 22 },
      { day: 'Day 7', gmp: 22 },
    ],
  },
  // Upcoming IPOs
  {
    id: 'hexaware-2025',
    companyName: 'Hexaware Technologies Limited',
    symbol: 'HEXAWARE',
    issueSize: 8750,
    issuePrice: '₹674-₹708',
    issuePriceLow: 674,
    issuePriceHigh: 708,
    openDate: '2025-02-12',
    closeDate: '2025-02-14',
    allotmentDate: '2025-02-17',
    listingDate: '2025-02-19',
    subscriptionStatus: 'Upcoming',
    gmp: 85,
    gmpPercent: 12.0,
    status: 'upcoming',
    category: 'mainboard',
    sector: 'IT Services',
    companyDescription:
      'Hexaware Technologies is a global IT services and business process services company with expertise in AI, cloud, and digital transformation serving Fortune 500 clients.',
    promoterHolding: 92.8,
    retailQuota: 35,
    qibQuota: 50,
    niiQuota: 15,
    financials: [
      { year: 'FY22', revenue: 8260, profit: 1115, eps: 18.6 },
      { year: 'FY23', revenue: 10389, profit: 1234, eps: 20.6 },
      { year: 'FY24', revenue: 11578, profit: 1024, eps: 17.1 },
    ],
    gmpHistory: [
      { day: 'Day 1', gmp: 60 },
      { day: 'Day 2', gmp: 65 },
      { day: 'Day 3', gmp: 70 },
      { day: 'Day 4', gmp: 75 },
      { day: 'Day 5', gmp: 80 },
      { day: 'Day 6', gmp: 83 },
      { day: 'Day 7', gmp: 85 },
    ],
  },
  {
    id: 'sebi-registered-2025',
    companyName: 'Capital SFB (Small Finance Bank)',
    symbol: 'CAPITALSFB',
    issueSize: 1500,
    issuePrice: '₹445-₹468',
    issuePriceLow: 445,
    issuePriceHigh: 468,
    openDate: '2025-02-18',
    closeDate: '2025-02-20',
    allotmentDate: '2025-02-21',
    listingDate: '2025-02-25',
    subscriptionStatus: 'Upcoming',
    gmp: 110,
    gmpPercent: 23.5,
    status: 'upcoming',
    category: 'mainboard',
    sector: 'Banking / NBFC',
    companyDescription:
      'Capital Small Finance Bank is India\'s first small finance bank, focusing on agricultural and semi-urban lending with a strong branch network across Punjab, Haryana, and Rajasthan.',
    promoterHolding: 25.1,
    retailQuota: 35,
    qibQuota: 50,
    niiQuota: 15,
    financials: [
      { year: 'FY22', revenue: 410, profit: 52, eps: 11.3 },
      { year: 'FY23', revenue: 530, profit: 95, eps: 20.5 },
      { year: 'FY24', revenue: 710, profit: 157, eps: 33.9 },
    ],
    gmpHistory: [
      { day: 'Day 1', gmp: 80 },
      { day: 'Day 2', gmp: 88 },
      { day: 'Day 3', gmp: 95 },
      { day: 'Day 4', gmp: 100 },
      { day: 'Day 5', gmp: 105 },
      { day: 'Day 6', gmp: 108 },
      { day: 'Day 7', gmp: 110 },
    ],
  },
  // Open IPO
  {
    id: 'adani-wilmar-sme-2025',
    companyName: 'Sagility India Limited',
    symbol: 'SAGILITY',
    issueSize: 2107,
    issuePrice: '₹28-₹30',
    issuePriceLow: 28,
    issuePriceHigh: 30,
    openDate: '2024-11-05',
    closeDate: '2024-11-07',
    allotmentDate: '2024-11-08',
    listingDate: '2024-11-12',
    listingPrice: 31.6,
    listingGain: 5.33,
    subscriptionStatus: '3.2x',
    retailSubscription: 2.1,
    niiSubscription: 1.3,
    qibSubscription: 6.1,
    gmp: 5,
    gmpPercent: 16.67,
    status: 'listed',
    category: 'mainboard',
    sector: 'Healthcare IT',
    companyDescription:
      'Sagility India is a healthcare-focused BPM company providing claims management, revenue cycle management, and clinical operations services to US healthcare payers and providers.',
    promoterHolding: 92.2,
    retailQuota: 35,
    qibQuota: 50,
    niiQuota: 15,
    financials: [
      { year: 'FY22', revenue: 1420, profit: 60, eps: 0.07 },
      { year: 'FY23', revenue: 2185, profit: 115, eps: 0.14 },
      { year: 'FY24', revenue: 2654, profit: 228, eps: 0.27 },
    ],
    gmpHistory: [
      { day: 'Day 1', gmp: 8 },
      { day: 'Day 2', gmp: 7 },
      { day: 'Day 3', gmp: 6 },
      { day: 'Day 4', gmp: 5 },
      { day: 'Day 5', gmp: 5 },
      { day: 'Day 6', gmp: 5 },
      { day: 'Day 7', gmp: 5 },
    ],
  },
];

export const HIGH_GMP_THRESHOLD = 15; // percent

export async function fetchIPOData(): Promise<IPOEntry[]> {
  // NSE requires browser cookies — return mock data directly
  return MOCK_IPOS;
}

export function getIPOsByStatus(ipos: IPOEntry[], status: IPOEntry['status']): IPOEntry[] {
  return ipos.filter((ipo) => ipo.status === status);
}

export function getHighGMPIPOs(ipos: IPOEntry[]): IPOEntry[] {
  return ipos.filter((ipo) => ipo.gmpPercent > HIGH_GMP_THRESHOLD);
}

export function getRecentListings(ipos: IPOEntry[]): IPOEntry[] {
  return ipos.filter((ipo) => ipo.status === 'listed').sort((a, b) => {
    return new Date(b.listingDate).getTime() - new Date(a.listingDate).getTime();
  });
}

export function getSortedByGMP(ipos: IPOEntry[]): IPOEntry[] {
  return [...ipos].sort((a, b) => b.gmpPercent - a.gmpPercent);
}

export function getIPORecommendation(ipo: IPOEntry): {
  rating: 'Apply' | 'Avoid' | 'Neutral';
  color: string;
  reasoning: string;
} {
  const sub = parseFloat(ipo.subscriptionStatus.replace('x', '')) || 0;
  if (ipo.gmpPercent > 20 && (sub > 10 || ipo.status === 'upcoming')) {
    return {
      rating: 'Apply',
      color: 'text-emerald-400',
      reasoning: `Strong GMP of ${ipo.gmpPercent.toFixed(1)}% signals robust market demand. ${sub > 1 ? `Subscription of ${sub.toFixed(1)}x indicates institutional confidence.` : ''} The sector (${ipo.sector}) is currently favoured by FIIs. Apply for listing gains.`,
    };
  }
  if (ipo.gmpPercent < 0 || (sub > 0 && sub < 1)) {
    return {
      rating: 'Avoid',
      color: 'text-red-400',
      reasoning: `Negative GMP of ${ipo.gmpPercent.toFixed(1)}% suggests weak market sentiment. ${sub > 0 && sub < 1 ? 'Poor subscription indicates lack of investor interest.' : ''} Risk of listing below issue price. Avoid for now.`,
    };
  }
  return {
    rating: 'Neutral',
    color: 'text-yellow-400',
    reasoning: `Moderate GMP of ${ipo.gmpPercent.toFixed(1)}% with ${ipo.subscriptionStatus} subscription. The company has decent fundamentals but valuations appear fair. Apply with risk awareness if you have long-term conviction in ${ipo.sector}.`,
  };
}
