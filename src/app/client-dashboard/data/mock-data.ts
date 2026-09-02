export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  sparklineKey: string;
}

export interface Position {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  lastPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPct: number;
}

export const initialWatchlist: WatchlistItem[] = [
  { symbol: "AAPL", name: "Apple Inc.", price: 182.52, change: 1.24, sparklineKey: "c7672" },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 415.6, change: -0.42, sparklineKey: "ca052" },
  { symbol: "TSLA", name: "Tesla Inc.", price: 176.54, change: 4.12, sparklineKey: "7fa04" },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: 174.42, change: 0.85, sparklineKey: "63bc3" },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 151.6, change: -1.15, sparklineKey: "49fc6" },
];

export const positions: Position[] = [
  { id: "1", symbol: "AAPL", shares: 150, avgCost: 168.2, lastPrice: 182.52, marketValue: 27378.0, unrealizedPnl: 2148.0, unrealizedPct: 8.51 },
  { id: "2", symbol: "TSLA", shares: 60, avgCost: 185.0, lastPrice: 176.54, marketValue: 10592.4, unrealizedPnl: -507.6, unrealizedPct: -4.57 },
  { id: "3", symbol: "AMZN", shares: 80, avgCost: 155.4, lastPrice: 174.42, marketValue: 13953.6, unrealizedPnl: 1521.6, unrealizedPct: 12.24 },
  { id: "4", symbol: "NVDA", shares: 45, avgCost: 420.0, lastPrice: 875.4, marketValue: 39393.0, unrealizedPnl: 20493.0, unrealizedPct: 108.57 },
  { id: "5", symbol: "MSFT", shares: 30, avgCost: 310.5, lastPrice: 415.6, marketValue: 12468.0, unrealizedPnl: 3153.0, unrealizedPct: 33.82 },
  { id: "6", symbol: "META", shares: 25, avgCost: 290.0, lastPrice: 485.2, marketValue: 12130.0, unrealizedPnl: 4880.0, unrealizedPct: 67.24 },
];

function generatePortfolioData(days: number, baseValue: number, endValue: number) {
  const data: { date: string; value: number }[] = [];
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const progress = (days - i) / days;
    const noise = (Math.random() - 0.4) * (endValue - baseValue) * 0.08;
    const trend = baseValue + (endValue - baseValue) * Math.pow(progress, 0.7);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.round((trend + noise) * 100) / 100,
    });
  }
  return data;
}

export const portfolioRanges: Record<string, { label: string; data: { date: string; value: number }[] }> = {
  "1D": { label: "1D", data: generatePortfolioData(1, 244800, 248512.9) },
  "5D": { label: "5D", data: generatePortfolioData(5, 241200, 248512.9) },
  "1Y": { label: "1Y", data: generatePortfolioData(365, 198000, 248512.9) },
  "3Y": { label: "3Y", data: generatePortfolioData(365 * 3, 142000, 248512.9) },
  "5Y": { label: "5Y", data: generatePortfolioData(365 * 5, 95000, 248512.9) },
};
