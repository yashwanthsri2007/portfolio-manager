import { MetalPrice, Holding } from '../types';

export function getGoldLivePrice(): MetalPrice {
  // Gold 24K baseline price ~ ₹7,450 per gram (₹74,500 per 10g)
  const pricePerGram = 7450;
  const pricePer10g = pricePerGram * 10;

  return {
    type: 'gold',
    pricePerGram,
    pricePer10g,
    dayChange: 45,
    dayChangePercent: 0.61,
    monthlyChangePercent: 3.42,
    yearlyChangePercent: 18.5,
    lastUpdated: new Date().toISOString()
  };
}

export function getSilverLivePrice(): MetalPrice {
  // Silver 999 Fine baseline price ~ ₹87 per gram (₹87,000 per kg)
  const pricePerGram = 87.00;
  const pricePerKg = pricePerGram * 1000;

  return {
    type: 'silver',
    pricePerGram,
    pricePerKg,
    dayChange: 1.20,
    dayChangePercent: 1.40,
    monthlyChangePercent: 5.10,
    yearlyChangePercent: 24.8,
    lastUpdated: new Date().toISOString()
  };
}

export function calculateGoldHoldingValue(holding: Holding, liveGold: MetalPrice) {
  const weightGrams = holding.metalDetails?.weightGrams || holding.quantity || 1;
  const category = holding.metalDetails?.metalCategory || '24K';

  // Category purity multipliers: 24K = 1.0, 22K = 0.916, Jewellery ~ 0.90 (including making/purity variance)
  let purityMultiplier = 1.0;
  if (category === '22K') purityMultiplier = 0.916;
  if (category === 'Jewellery') purityMultiplier = 0.88;

  const currentPricePerGram = liveGold.pricePerGram * purityMultiplier;
  const currentValue = weightGrams * currentPricePerGram;

  // Invested calculation: averagePrice in INR per 10g or per gram
  const investedPerGram = holding.averagePrice > 10000 ? holding.averagePrice / 10 : holding.averagePrice;
  const totalInvested = weightGrams * investedPerGram;

  const profitLoss = currentValue - totalInvested;
  const returnPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  return {
    weightGrams,
    currentPricePerGram,
    totalInvested,
    currentValue,
    profitLoss,
    returnPercent
  };
}

export function calculateSilverHoldingValue(holding: Holding, liveSilver: MetalPrice) {
  const weightGrams = holding.metalDetails?.weightGrams || holding.quantity || 1;
  const category = holding.metalDetails?.metalCategory || 'Bars';

  let purityMultiplier = 1.0;
  if (category === 'Jewellery') purityMultiplier = 0.90;

  const currentPricePerGram = liveSilver.pricePerGram * purityMultiplier;
  const currentValue = weightGrams * currentPricePerGram;

  // Invested calculation: averagePrice in INR per kg or per gram
  const investedPerGram = holding.averagePrice > 10000 ? holding.averagePrice / 1000 : holding.averagePrice;
  const totalInvested = weightGrams * investedPerGram;

  const profitLoss = currentValue - totalInvested;
  const returnPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  return {
    weightGrams,
    currentPricePerGram,
    totalInvested,
    currentValue,
    profitLoss,
    returnPercent
  };
}
