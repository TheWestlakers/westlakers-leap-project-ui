import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface NavItem {
  label: string;
  icon: string;
  badge?: string;
  badgeType?: 'count' | 'alert';
  active?: boolean;
}

export interface StatCard {
  label: string;
  value: string;
  change: string;
  changePositive: boolean;
  sub: string;
}

export interface SystemHealth {
  label: string;
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
}

export interface RiskAlert {
  tag: string;
  tagColor: 'yellow' | 'orange' | 'red';
  time: string;
  title: string;
  body: string;
}

export interface PendingOrder {
  accountId: string;
  symbol: string;
  qty: number;
  gateway: string;
  estValue: string;
  risk: string;
  riskAlert: boolean;
}

export interface BroadcastEntry {
  time: string;
  message: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  searchQuery = '';
  activeNav = 'Operator Console';

  navItems: NavItem[] = [
    { label: 'Operator Console', icon: 'home', active: true },
    { label: 'User Accounts', icon: 'people', badge: '24.1k', badgeType: 'count' },
    { label: 'Trade Transactions', icon: 'credit_card' },
    { label: 'Revenue Reports', icon: 'schedule' },
    { label: 'Risk & KYC', icon: 'terminal', badge: '5 alert', badgeType: 'alert' },
    { label: 'System Controls', icon: 'settings' },
    { label: 'Operator Support', icon: 'help_outline' },
  ];

  statCards: StatCard[] = [
    { label: 'TOTAL ACCOUNTS', value: '142,851', change: '+12.4%', changePositive: true, sub: 'Active retail users YTD' },
    { label: 'OPERATING TRADERS', value: '28,412', change: '96.1%', changePositive: true, sub: 'Live sessions today' },
    { label: 'TOTAL VOLUME TODAY', value: '$14.2M', change: '+4.12%', changePositive: true, sub: 'Over 14,801 transactions' },
    { label: 'REVENUE PROCESSED', value: '$48,512', change: '+8.51%', changePositive: true, sub: 'Platform commissions' },
    { label: 'LATENCY SPREAD', value: '1.42ms', change: 'Nominal', changePositive: true, sub: 'Database response timing' },
  ];

  systemHealth: SystemHealth[] = [
    { label: 'Core Matching Engine', status: 'HEALTHY' },
    { label: 'Websocket Live Hub', status: 'HEALTHY' },
    { label: 'Margin Liquidation Job', status: 'DEGRADED' },
  ];

  riskAlerts: RiskAlert[] = [
    {
      tag: 'SUSPICIOUS RAPID BUYING',
      tagColor: 'yellow',
      time: 'Just now',
      title: 'Account USR-2490 Rapid Buy Order',
      body: 'Triggered flag: placed 50 consecutive market buy orders in 500ms on stock TSLA.',
    },
    {
      tag: 'REGULATORY KYC THRESHOLD',
      tagColor: 'orange',
      time: 'Just now',
      title: 'Account USR-8411 Balance Limit',
      body: 'Deposited $50,000 without tier-3 bank statement uploaded. Deposit put on hold.',
    },
    {
      tag: 'HFT LATENCY SPIKE',
      tagColor: 'red',
      time: 'Just now',
      title: 'WS Connection Latency',
      body: 'Operator cluster node PaySprint-WS-East reported momentary drop to 20ms response.',
    },
  ];

  pendingOrders: PendingOrder[] = [
    { accountId: 'USR-8812', symbol: 'AAPL', qty: 500, gateway: 'FINRA-1B', estValue: '$91,260.00', risk: 'CLEARED (LOW RISK)', riskAlert: false },
    { accountId: 'USR-4421', symbol: 'TSLA', qty: 1200, gateway: 'APEX-S', estValue: '$211,848.00', risk: 'ALERT: MARGIN LIMIT EXCEEDED', riskAlert: true },
    { accountId: 'USR-9021', symbol: 'AMZN', qty: 450, gateway: 'FINRA-1B', estValue: '$78,489.00', risk: 'CLEARED (LOW RISK)', riskAlert: false },
  ];

  broadcastFeed: BroadcastEntry[] = [
    { time: '10:14:52', message: 'AAPL buy 150 @ $182.52' },
    { time: '10:14:50', message: 'AMZN buy 80 @ $174.42' },
    { time: '10:14:48', message: 'TSLA sell 60 @ $176.54' },
  ];

  txRate = '12,851 tx/m';
  txWorkload = '+1.42% workload';
  apiLatency = '1.4ms';

  /* SVG chart path — S-curve rising from lower-left to upper-right */
  readonly chartViewBox = '0 0 660 200';
  readonly chartPath =
    'M0,190 C30,185 60,175 100,160 C140,145 160,130 200,110 C240,90 270,70 310,50 C350,30 390,20 430,15 C470,10 510,8 560,5 C600,3 630,2 660,1';
  readonly chartFill =
    'M0,190 C30,185 60,175 100,160 C140,145 160,130 200,110 C240,90 270,70 310,50 C350,30 390,20 430,15 C470,10 510,8 560,5 C600,3 630,2 660,1 L660,200 L0,200 Z';

  xLabels = ['10:11', '10:12', '10:13', '10:14'];
  yLabels = ['20k', '15k', '10k', '5k'];

  haltActive = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.tickInterval = setInterval(() => {
      const [h, m, s] = this.broadcastFeed[0].time.split(':').map(Number);
      const next = new Date(0, 0, 0, h, m, s + 2);
      const pad = (n: number) => String(n).padStart(2, '0');
      const newTime = `${pad(next.getHours())}:${pad(next.getMinutes())}:${pad(next.getSeconds())}`;
      const symbols = ['AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'NVDA'];
      const sides = ['buy', 'sell'];
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      const side = sides[Math.floor(Math.random() * sides.length)];
      const qty = Math.floor(Math.random() * 200) + 10;
      const price = (150 + Math.random() * 300).toFixed(2);
      this.broadcastFeed = [
        { time: newTime, message: `${sym} ${side} ${qty} @ $${price}` },
        ...this.broadcastFeed.slice(0, 2),
      ];
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  setActiveNav(label: string): void {
    this.activeNav = label;
    this.navItems = this.navItems.map((n) => ({ ...n, active: n.label === label }));
  }

  toggleHalt(): void {
    this.haltActive = !this.haltActive;
  }

  get alertTagClass(): Record<string, (color: string) => string> {
    return {};
  }

  tagClass(color: string): string {
    const map: Record<string, string> = {
      yellow: 'tag-yellow',
      orange: 'tag-orange',
      red: 'tag-red',
    };
    return map[color] ?? 'tag-yellow';
  }

  healthClass(status: string): string {
    return status === 'HEALTHY' ? 'health-ok' : 'health-bad';
  }
}
