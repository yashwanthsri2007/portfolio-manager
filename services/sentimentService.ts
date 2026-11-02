import { NewsItem } from '../types';

export interface SentimentAnalysisResult {
  score: number; // 0 - 100
  label: 'Bullish' | 'Neutral' | 'Bearish';
  bullishCount: number;
  neutralCount: number;
  bearishCount: number;
  topPositiveHoldings: string[];
  topRiskHoldings: string[];
}

export function calculatePortfolioSentiment(newsList: NewsItem[]): SentimentAnalysisResult {
  if (!newsList || newsList.length === 0) {
    return {
      score: 50,
      label: 'Neutral',
      bullishCount: 0,
      neutralCount: 0,
      bearishCount: 0,
      topPositiveHoldings: [],
      topRiskHoldings: []
    };
  }

  let totalPoints = 0;
  let totalWeight = 0;

  let bullishCount = 0;
  let neutralCount = 0;
  let bearishCount = 0;

  const positiveHoldings = new Set<string>();
  const riskHoldings = new Set<string>();

  newsList.forEach(news => {
    const confidence = news.confidence || 0.8;
    if (news.sentiment === 'bullish') {
      bullishCount++;
      totalPoints += 100 * confidence;
      totalWeight += confidence;
      if (news.relatedSymbol) positiveHoldings.add(news.relatedSymbol);
    } else if (news.sentiment === 'bearish') {
      bearishCount++;
      // Bearish awards 0 points to totalPoints
      totalWeight += confidence;
      if (news.relatedSymbol) riskHoldings.add(news.relatedSymbol);
    } else {
      neutralCount++;
      totalPoints += 50 * confidence;
      totalWeight += confidence;
    }
  });

  const score = totalWeight > 0 ? Math.round(totalPoints / totalWeight) : 50;

  let label: 'Bullish' | 'Neutral' | 'Bearish' = 'Neutral';
  if (score >= 65) label = 'Bullish';
  else if (score <= 40) label = 'Bearish';

  return {
    score,
    label,
    bullishCount,
    neutralCount,
    bearishCount,
    topPositiveHoldings: Array.from(positiveHoldings),
    topRiskHoldings: Array.from(riskHoldings)
  };
}
