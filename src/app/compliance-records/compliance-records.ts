import { Component, OnInit, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Location } from "@angular/common";
import { ThemeService } from "../services/theme.service";

const assetPathPrefix = "/assets";
const RECORDS_PER_PAGE = 20;

export interface ComplianceRecord {
  orderReference: string;
  clientId: string;
  clientName: string;
  timestamp: Date;
  orderDecision: {
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    limitPrice?: number;
  };
  pricingDecision: {
    executionPrice: number;
    priceSource: "MARKET" | "LIMIT" | "MANUAL";
    appliedMarkup?: number;
  };
  executionResult: {
    status: "ACCEPTED" | "PARTIALLY_FILLED" | "FILLED" | "REJECTED" | "CANCELLED";
    executedQuantity: number;
    executedPrice: number;
    executionTime: Date;
    executionVenue?: string;
  };
  cashAndHoldingChange: {
    cashImpact: number;
    holdingSymbol: string;
    holdingQuantityChange: number;
    holdingAveragePrice: number;
    marketValueImpact: number;
  };
  recordedAt: Date;
  immutableHash?: string;
}

@Component({
  selector: "app-compliance-records",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./compliance-records.html",
  styleUrl: "./compliance-records.css",
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class ComplianceRecordsComponent implements OnInit {
  protected readonly themeService = inject(ThemeService);
  allRecords = signal<ComplianceRecord[]>([]);
  paginatedRecords = signal<ComplianceRecord[]>([]);
  currentPage = signal(1);
  totalPages = signal(1);
  imgFileText = `${assetPathPrefix}/file-text.svg`;
  Math = Math; // Make Math available in template

  constructor(private location: Location) {}

  ngOnInit() {
    // Load mock data on component initialization
    // TO IMPLEMENT ACTUAL BACKEND:
    // Replace the line below with:
    // this.complianceService.getRecords().subscribe(data => this.loadRecords(data));
    const allData = this.generateMockComplianceRecords(100); // Simulate 100 total records
    this.loadRecords(allData);
  }

  generateMockComplianceRecords(count: number = 20): ComplianceRecord[] {
    const symbols = ["AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "META", "NVDA", "AMD"];
    const clients = [
      { id: "CLI001", name: "Acme Corp Trading" },
      { id: "CLI002", name: "Tech Venture Fund" },
      { id: "CLI003", name: "Global Asset Management" },
      { id: "CLI004", name: "Quantum Trading LLC" },
    ];

    const records: ComplianceRecord[] = [];
    const baseTime = new Date();

    for (let i = 0; i < count; i++) {
      const randomClient = clients[Math.floor(Math.random() * clients.length)];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const quantity = Math.floor(Math.random() * 500) + 10;
      const side = Math.random() > 0.5 ? "BUY" : "SELL";
      const basePrice = Math.floor(Math.random() * 300) + 50;
      const executionPrice = basePrice + (Math.random() - 0.5) * 10;

      const timestamp = new Date(baseTime);
      timestamp.setMinutes(timestamp.getMinutes() - i * 15);

      const executionTime = new Date(timestamp);
      executionTime.setSeconds(executionTime.getSeconds() + Math.floor(Math.random() * 120));

      const executedQuantity = Math.random() > 0.1 ? quantity : Math.floor(quantity * 0.8);
      const cashImpact = side === "BUY" ? -quantity * executionPrice : quantity * executionPrice;

      records.push({
        orderReference: `ORD-${Date.now()}-${i.toString().padStart(4, "0")}`,
        clientId: randomClient.id,
        clientName: randomClient.name,
        timestamp,
        orderDecision: {
          symbol,
          side,
          quantity,
          limitPrice: Math.random() > 0.5 ? basePrice : undefined,
        },
        pricingDecision: {
          executionPrice,
          priceSource: Math.random() > 0.4 ? "MARKET" : "LIMIT",
          appliedMarkup: Math.random() * 0.5,
        },
        executionResult: {
          status: Math.random() > 0.05 ? "FILLED" : ["PARTIALLY_FILLED", "REJECTED"][Math.floor(Math.random() * 2)] as any,
          executedQuantity,
          executedPrice: executionPrice,
          executionTime,
          executionVenue: ["NYSE", "NASDAQ", "OTC"][Math.floor(Math.random() * 3)],
        },
        cashAndHoldingChange: {
          cashImpact,
          holdingSymbol: symbol,
          holdingQuantityChange: side === "BUY" ? executedQuantity : -executedQuantity,
          holdingAveragePrice: basePrice,
          marketValueImpact: executedQuantity * executionPrice,
        },
        recordedAt: new Date(executionTime),
        immutableHash: `HASH-${Math.random().toString(36).substring(2, 15)}`,
      });
    }

    return records;
  }

  loadRecords(data: ComplianceRecord[]): void {
    this.allRecords.set(data);
    this.totalPages.set(Math.ceil(data.length / RECORDS_PER_PAGE));
    this.goToPage(1);
  }

  goToPage(page: number): void {
    const startIdx = (page - 1) * RECORDS_PER_PAGE;
    const endIdx = startIdx + RECORDS_PER_PAGE;
    this.paginatedRecords.set(this.allRecords().slice(startIdx, endIdx));
    this.currentPage.set(page);
    window.scrollTo(0, 0);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  goBack(): void {
    this.location.back();
  }

  getAcceptedCount(): number {
    return this.allRecords().filter((r) => r.executionResult.status === "FILLED" || r.executionResult.status === "PARTIALLY_FILLED").length;
  }

  getTotalCashImpact(): number {
    return this.allRecords().reduce((sum, record) => sum + record.cashAndHoldingChange.cashImpact, 0);
  }
}
