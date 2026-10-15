import { Injectable } from '@angular/core';
import { StockPrice } from './stock-data.service';
import { Account } from './account.service';

export interface PortfolioHolding {
  symbol: string;
  shares: number;
  avgCost: number;
}

export interface AccountSummary {
  settledCash: number;
  holdingsValue: number;
  totalAccountValue: number;
  buyingPower: number;
}

@Injectable({ providedIn: 'root' })
export class PortfolioValueService {
  calculateSummary(
    account: Account | null,
    holdings: PortfolioHolding[],
    prices: { [symbol: string]: StockPrice },
  ): AccountSummary {
    const settledCash = Number(account?.settledCash ?? 0);
    const holdingsValue = holdings.reduce((total, holding) => {
      const currentPrice = prices[holding.symbol]?.currentPrice ?? holding.avgCost;
      return total + holding.shares * Number(currentPrice);
    }, 0);

    return {
      settledCash,
      holdingsValue,
      totalAccountValue: settledCash + holdingsValue,
      buyingPower: settledCash,
    };
  }
}
