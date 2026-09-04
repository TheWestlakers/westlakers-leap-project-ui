import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type TransactionSide = 'BUY' | 'SELL' | 'DIVIDEND' | 'TRANSFER';
export type TransactionType = 'EQUITY' | 'CASH' | 'OPTION';
export type TransactionStatus = 'Filled' | 'Completed' | 'Pending' | 'Cancelled';

export interface Transaction {
  id: string;
  date: string;
  time: string;
  symbol: string;
  type: TransactionType;
  side: TransactionSide;
  qty: number | null;
  price: number | null;
  totalAmount: number;
  fees: number | null;
  status: TransactionStatus;
}

export type DateRangeOption = 'Last 30 Days' | 'Last 7 Days' | 'Last 90 Days' | 'This Year' | 'All Time';
export type AssetTypeOption = 'All Assets' | 'Equity' | 'Cash' | 'Option';
export type StatusOption = 'All Statuses' | 'Filled' | 'Completed' | 'Pending' | 'Cancelled';

const ALL_TRANSACTIONS: Transaction[] = [
  { id: 't1',  date: '2024-04-18', time: '14:32:15', symbol: 'AAPL', type: 'EQUITY', side: 'BUY',      qty: 50,   price: 182.52, totalAmount: -9126,    fees: null,  status: 'Filled' },
  { id: 't2',  date: '2024-04-18', time: '11:15:04', symbol: 'TSLA', type: 'EQUITY', side: 'SELL',     qty: 20,   price: 176.54, totalAmount: 3530.8,   fees: 0.05,  status: 'Filled' },
  { id: 't3',  date: '2024-04-17', time: '09:45:12', symbol: 'AMZN', type: 'EQUITY', side: 'BUY',      qty: 80,   price: 174.42, totalAmount: -13953.6, fees: null,  status: 'Filled' },
  { id: 't4',  date: '2024-04-15', time: '16:00:00', symbol: 'MSFT', type: 'EQUITY', side: 'DIVIDEND', qty: null, price: null,   totalAmount: 142.5,    fees: null,  status: 'Completed' },
  { id: 't5',  date: '2024-04-12', time: '13:22:51', symbol: 'NVDA', type: 'EQUITY', side: 'SELL',     qty: 15,   price: 875.12, totalAmount: 13126.8,  fees: 0.18,  status: 'Filled' },
  { id: 't6',  date: '2024-04-10', time: '10:05:33', symbol: 'TSLA', type: 'EQUITY', side: 'BUY',      qty: 60,   price: 185.00, totalAmount: -11100,   fees: null,  status: 'Filled' },
  { id: 't7',  date: '2024-04-08', time: '09:31:02', symbol: 'GOOGL', type: 'EQUITY', side: 'BUY',     qty: 100,  price: 151.60, totalAmount: -15160,   fees: null,  status: 'Filled' },
  { id: 't8',  date: '2024-04-05', time: '15:45:00', symbol: 'USD',  type: 'CASH',   side: 'TRANSFER', qty: null, price: null,   totalAmount: 5000,     fees: null,  status: 'Completed' },
  { id: 't9',  date: '2024-04-03', time: '10:22:11', symbol: 'AAPL', type: 'EQUITY', side: 'BUY',      qty: 25,   price: 178.90, totalAmount: -4472.5,  fees: null,  status: 'Filled' },
  { id: 't10', date: '2024-04-01', time: '09:31:00', symbol: 'MSFT', type: 'EQUITY', side: 'SELL',     qty: 10,   price: 412.00, totalAmount: 4120,     fees: 0.05,  status: 'Filled' },
  { id: 't11', date: '2024-03-28', time: '14:15:00', symbol: 'AMZN', type: 'EQUITY', side: 'BUY',      qty: 30,   price: 172.10, totalAmount: -5163,    fees: null,  status: 'Filled' },
  { id: 't12', date: '2024-03-25', time: '11:30:00', symbol: 'NVDA', type: 'EQUITY', side: 'BUY',      qty: 5,    price: 860.00, totalAmount: -4300,    fees: null,  status: 'Filled' },
  { id: 't13', date: '2024-03-22', time: '09:45:00', symbol: 'GOOGL', type: 'EQUITY', side: 'SELL',    qty: 20,   price: 155.00, totalAmount: 3100,     fees: 0.05,  status: 'Filled' },
  { id: 't14', date: '2024-03-20', time: '16:00:00', symbol: 'TSLA', type: 'EQUITY', side: 'DIVIDEND', qty: null, price: null,   totalAmount: 45.00,    fees: null,  status: 'Completed' },
  { id: 't15', date: '2024-03-18', time: '10:10:00', symbol: 'USD',  type: 'CASH',   side: 'TRANSFER', qty: null, price: null,   totalAmount: 10000,    fees: null,  status: 'Completed' },
];

const PAGE_SIZE = 8;

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transaction-history.component.html',
  styleUrls: ['./transaction-history.component.css'],
})
export class TransactionHistoryComponent implements OnInit {
  /* ── Signals ── */
  symbolFilter = signal('');
  dateRange    = signal<DateRangeOption>('Last 30 Days');
  assetType    = signal<AssetTypeOption>('All Assets');
  statusFilter = signal<StatusOption>('All Statuses');
  currentPage  = signal(1);
  activeTab    = signal<'Transactions' | 'Open Orders' | 'Statements'>('Transactions');

  /* ── Filter options ── */
  dateRangeOptions: DateRangeOption[]  = ['Last 30 Days', 'Last 7 Days', 'Last 90 Days', 'This Year', 'All Time'];
  assetTypeOptions: AssetTypeOption[]  = ['All Assets', 'Equity', 'Cash', 'Option'];
  statusOptions:    StatusOption[]     = ['All Statuses', 'Filled', 'Completed', 'Pending', 'Cancelled'];

  /* ── Derived state ── */
  get filteredTransactions(): Transaction[] {
    return ALL_TRANSACTIONS.filter((tx) => {
      const sym = this.symbolFilter().trim().toUpperCase();
      if (sym && !tx.symbol.includes(sym)) return false;
      const type = this.assetType();
      if (type !== 'All Assets' && tx.type.toLowerCase() !== type.toLowerCase()) return false;
      const status = this.statusFilter();
      if (status !== 'All Statuses' && tx.status !== status) return false;
      return true;
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTransactions.length / PAGE_SIZE);
  }

  get pagedTransactions(): Transaction[] {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredTransactions.slice(start, start + PAGE_SIZE);
  }

  get pageNumbers(): (number | '...')[] {
    const total = this.totalPages;
    if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
    const cur = this.currentPage();
    const pages: (number | '...')[] = [1];
    if (cur > 3) pages.push('...');
    for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p);
    if (cur < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  get showingLabel(): string {
    const start = (this.currentPage() - 1) * PAGE_SIZE + 1;
    const end   = Math.min(this.currentPage() * PAGE_SIZE, this.filteredTransactions.length);
    return `Showing ${start}–${end} of ${this.filteredTransactions.length} transactions`;
  }

  /* ── Summary stats ── */
  readonly totalTrades    = ALL_TRANSACTIONS.filter((t) => t.side === 'BUY' || t.side === 'SELL').length;
  readonly totalVolume    = 1842900.50;
  readonly realizedPnl    = 14210.45;
  readonly tradeChangePct = '+12.4%';
  readonly volumeChange   = '-$84.2k';
  readonly pnlYield       = '+3.12%';

  ngOnInit(): void {}

  /* ── Actions ── */
  setPage(page: number | '...'): void {
    if (typeof page === 'number') this.currentPage.set(page);
  }

  prevPage(): void {
    if (this.currentPage() > 1) this.currentPage.update((p) => p - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages) this.currentPage.update((p) => p + 1);
  }

  onSymbolInput(value: string): void {
    this.symbolFilter.set(value);
    this.currentPage.set(1);
  }

  onDateRangeChange(value: string): void {
    this.dateRange.set(value as DateRangeOption);
    this.currentPage.set(1);
  }

  onAssetTypeChange(value: string): void {
    this.assetType.set(value as AssetTypeOption);
    this.currentPage.set(1);
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value as StatusOption);
    this.currentPage.set(1);
  }

  exportCsv(): void {
    const header = 'Date,Time,Symbol,Type,Side,Qty,Price,Total Amount,Fees,Status';
    const rows = this.filteredTransactions.map((t) =>
      [t.date, t.time, t.symbol, t.type, t.side, t.qty ?? '–', t.price ?? '–', t.totalAmount, t.fees ?? 'FREE', t.status].join(',')
    );
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Style helpers ── */
  sideClass(side: TransactionSide): string {
    const map: Record<TransactionSide, string> = {
      BUY: 'side-buy', SELL: 'side-sell', DIVIDEND: 'side-dividend', TRANSFER: 'side-transfer',
    };
    return map[side];
  }

  statusClass(status: TransactionStatus): string {
    const map: Record<TransactionStatus, string> = {
      Filled: 'status-filled', Completed: 'status-completed',
      Pending: 'status-pending', Cancelled: 'status-cancelled',
    };
    return map[status];
  }

  amountClass(amount: number): string {
    return amount >= 0 ? 'amount-positive' : 'amount-negative';
  }

  formatAmount(amount: number): string {
    const abs = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return amount >= 0 ? `+$${abs}` : `-$${abs}`;
  }

  minOf(a: number, b: number): number {
    return Math.min(a, b);
  }

  formatFees(fees: number | null): string {
    return fees !== null ? `$${fees.toFixed(2)}` : 'FREE';
  }
}
