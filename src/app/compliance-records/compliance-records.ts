import { Component, OnInit, signal, inject } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { PLATFORM_ID } from "@angular/core";
import { Location } from "@angular/common";
import { ThemeService } from "../services/theme.service";
import { TradingVolume, TradingVolumeService } from "../services/trading-volume.service";

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
    executionPrice: number | null;
    priceSource: "MARKET" | "LIMIT" | "MANUAL";
    appliedMarkup?: number;
  };
  executionResult: {
    status: "PENDING" | "EXECUTED" | "CANCELLED" | "REJECTED" | "UNKNOWN";
    statusId: string | null;
    executedQuantity: number;
    executedPrice: number | null;
    executionTime: Date;
    executionVenue?: string;
  };
  cashAndHoldingChange: {
    cashImpact: number | null;
    holdingSymbol: string;
    holdingQuantityChange: number;
    holdingAveragePrice: number | null;
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
  private readonly platformId = inject(PLATFORM_ID);
  allRecords = signal<ComplianceRecord[]>([]);
  paginatedRecords = signal<ComplianceRecord[]>([]);
  currentPage = signal(1);
  totalPages = signal(1);
  totalRecords = signal(0);
  imgFileText = `${assetPathPrefix}/file-text.svg`;
  Math = Math; // Make Math available in template

  constructor(
    private location: Location,
    private tradingVolumeService: TradingVolumeService,
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadPage(1);
    this.loadAllRecords();
  }

  loadPage(page: number): void {
    this.tradingVolumeService.getTradingVolumes(page - 1).subscribe((response) => {
      const records = response.content.map((volume) => this.toComplianceRecord(volume));
      this.paginatedRecords.set(records);
      this.currentPage.set(response.page + 1);
      this.totalPages.set(Math.max(response.totalPages, 1));
      this.totalRecords.set(response.totalElements);
    });
  }

  loadAllRecords(): void {
    this.tradingVolumeService.getAllTradingVolumes().subscribe((volumes) => {
      this.allRecords.set(volumes.map((volume) => this.toComplianceRecord(volume)));
    });
  }

  goToPage(page: number): void {
    const startIdx = (page - 1) * RECORDS_PER_PAGE;
    const endIdx = startIdx + RECORDS_PER_PAGE;
    this.paginatedRecords.set(this.allRecords().slice(startIdx, endIdx));
    this.currentPage.set(page);
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo(0, 0);
    }
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
    return this.totalRecords();
  }

  getTotalCashImpact(): number {
    return this.allRecords().reduce(
      (sum, record) => sum + (record.cashAndHoldingChange.cashImpact ?? 0),
      0,
    );
  }

  private toComplianceRecord(volume: TradingVolume): ComplianceRecord {
    const timestamp = volume.executedAt ?? volume.createdAt;
    const price = volume.limitPrice;
    const quantity = Number(volume.quantity);
    const isMarketOrder = price === 0;

    return {
      orderReference: `${isMarketOrder ? "M" : "L"}-${volume.orderId}`,
      clientId: String(volume.accountId),
      clientName: [volume.firstName, volume.lastName].filter(Boolean).join(" ") || `Account ${volume.accountId}`,
      timestamp: timestamp ? new Date(timestamp) : new Date(0),
      orderDecision: {
        symbol: volume.instrumentCode,
        side: volume.side,
        quantity,
        limitPrice: volume.limitPrice ?? undefined,
      },
      pricingDecision: {
        executionPrice: volume.executionPrice,
        priceSource: isMarketOrder ? "MARKET" : "LIMIT",
      },
      executionResult: {
        status: volume.orderStatus === "PENDING" || volume.orderStatus === "EXECUTED" || volume.orderStatus === "CANCELLED" || volume.orderStatus === "REJECTED"
          ? volume.orderStatus
          : "UNKNOWN",
        statusId: volume.orderStatusId,
        executedQuantity: quantity,
        executedPrice: volume.executionPrice,
        executionTime: timestamp ? new Date(timestamp) : new Date(0),
      },
      cashAndHoldingChange: {
        cashImpact: price === null ? null : volume.side === "BUY" ? -quantity * price : quantity * price,
        holdingSymbol: volume.instrumentCode,
        holdingQuantityChange: volume.side === "BUY" ? quantity : -quantity,
        holdingAveragePrice: price,
        marketValueImpact: price === null ? 0 : quantity * price,
      },
      recordedAt: volume.createdAt ? new Date(volume.createdAt) : new Date(0),
    };
  }
}
