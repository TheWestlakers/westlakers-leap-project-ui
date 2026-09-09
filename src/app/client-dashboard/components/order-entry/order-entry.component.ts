import { Component, Input, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ThemeService } from "../../../services/theme.service";

const assetPathPrefix = "/assets";

type Side = "BUY" | "SELL";
type OrderType = "LIMIT" | "MARKET";

@Component({
  selector: "app-order-entry",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="flex flex-col rounded-[8px] w-full border transition-colors"
      [ngStyle]="{
        'background-color': themeService.isDarkMode() ? '#11161b' : '#f3f4f6',
        'border-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db'
      }"
    >
      <div 
        class="border-b flex items-center justify-between px-4 py-3 transition-colors"
        [ngStyle]="{ 'border-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db' }"
      >
        <div class="flex gap-2 items-center">
          <img alt="" class="size-4" [src]="imgZap" />
          <p class="font-['Instrument_Sans:SemiBold'] font-semibold text-[14px] whitespace-nowrap" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }" style="font-variation-settings: 'wdth' 100">
            ORDER ENTRY
          </p>
        </div>
        <p class="font-['Geist_Mono:Regular'] font-normal text-[11px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#64748b' : '#6b7280' }">MAR-9801</p>
      </div>

      <div class="flex gap-2 items-center p-2">
        <button
          (click)="side = 'BUY'"
          class="flex-1 py-2.5 rounded-[6px] font-['Instrument_Sans:Bold'] font-bold text-[13px] transition-all cursor-pointer"
          [ngClass]="side === 'BUY' ? 'bg-[rgba(16,185,129,0.1)] border border-[#10b981] text-[#10b981]' : 'border border-[#1e252b] text-[#94a3b8] hover:border-[#2d3748]'"
          style="font-variation-settings: 'wdth' 100"
        >
          BUY
        </button>
        <button
          (click)="side = 'SELL'"
          class="flex-1 py-2.5 rounded-[6px] font-['Instrument_Sans:Bold'] font-bold text-[13px] transition-all cursor-pointer"
          [ngClass]="side === 'SELL' ? 'bg-[rgba(239,68,68,0.1)] border border-[#ef4444] text-[#ef4444]' : 'border border-[#1e252b] text-[#94a3b8] hover:border-[#2d3748]'"
          style="font-variation-settings: 'wdth' 100"
        >
          SELL
        </button>
      </div>

      <div class="flex flex-col gap-3.5 items-start p-3 w-full">
        <div 
          class="flex items-center justify-between p-2.5 rounded-[6px] w-full border transition-colors"
          [ngStyle]="{
            'background-color': themeService.isDarkMode() ? '#080b0d' : '#ffffff',
            'border-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb'
          }"
        >
          <p class="font-['Instrument_Sans:Regular'] font-normal text-[12px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#64748b' : '#6b7280' }" style="font-variation-settings: 'wdth' 100">
            SYMBOL
          </p>
          <input
            class="bg-transparent font-['Geist_Mono:Bold'] font-bold text-[13px] text-right outline-none w-24 uppercase"
            [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }"
            [ngModel]="symbol"
            (ngModelChange)="symbol = $event.toUpperCase()"
          />
        </div>

        <div class="flex flex-col gap-1.5 w-full">
          <p class="font-['Instrument_Sans:Regular'] font-normal text-[#94a3b8] text-[11px]" style="font-variation-settings: 'wdth' 100">
            ORDER TYPE
          </p>
          <div class="flex gap-1 w-full">
            @for (t of orderTypes; track t) {
              <button
                (click)="orderType = t"
                class="flex-1 py-2 rounded-[4px] font-['Instrument_Sans:SemiBold'] font-semibold text-[12px] transition-all cursor-pointer"
                [ngClass]="orderType === t ? 'bg-[#262e36] border border-[#3e8914] text-white' : 'border border-[#1e252b] text-[#94a3b8] hover:border-[#2d3748]'"
                style="font-variation-settings: 'wdth' 100"
              >
                {{ t }}
              </button>
            }
          </div>
        </div>

        <div class="flex gap-3 w-full">
          <div class="flex-1 flex flex-col gap-1.5">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[11px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#6b7280' }" style="font-variation-settings: 'wdth' 100">
              SHARES
            </p>
            <div 
              class="flex items-center justify-between p-2.5 rounded-[6px] focus-within:border-[#3e8914] transition-colors border"
              [ngStyle]="{
                'background-color': themeService.isDarkMode() ? '#080b0d' : '#ffffff',
                'border-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb'
              }"
            >
              <input
                type="number"
                class="bg-transparent font-['Geist_Mono:Regular'] text-[13px] outline-none w-full"
                [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }"
                [ngModel]="shares"
                (ngModelChange)="shares = $event ? Math.max(1, parseInt($event, 10) || 1) : 1"
                min="1"
              />
              <div class="flex flex-col text-[8px] ml-1 cursor-pointer" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#64748b' : '#9ca3af' }">
                <span (click)="shares = shares + 1">▲</span>
                <span (click)="shares = Math.max(1, shares - 1)">▼</span>
              </div>
            </div>
          </div>
          <div class="flex-1 flex flex-col gap-1.5">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[11px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#6b7280' }" style="font-variation-settings: 'wdth' 100">
              {{ orderType === "LIMIT" ? "LIMIT PRICE" : "MKT PRICE" }}
            </p>
            <div 
              class="flex items-center justify-between p-2.5 rounded-[6px] focus-within:border-[#3e8914] transition-colors border"
              [ngStyle]="{
                'background-color': themeService.isDarkMode() ? '#080b0d' : '#ffffff',
                'border-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb'
              }"
            >
              <input
                type="number"
                class="bg-transparent font-['Geist_Mono:Regular'] text-[13px] outline-none w-full"
                [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }"
                [ngModel]="limitPrice"
                (ngModelChange)="limitPrice = parseFloat($event) || 0"
                step="0.01"
                [disabled]="orderType === 'MARKET'"
              />
              <span class="font-['Instrument_Sans:Regular'] text-[11px] ml-1" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#64748b' : '#9ca3af' }" style="font-variation-settings: 'wdth' 100">$</span>
            </div>
          </div>
        </div>

        <button (click)="extHours = !extHours" class="flex gap-2.5 items-center cursor-pointer">
          <div
            class="flex items-center justify-center border-2 rounded-[3px] size-4 transition-colors bg-[#080b0d]"
            [ngClass]="extHours ? 'border-[#3e8914]' : 'border-[#1e252b]'"
          >
            @if (extHours) {
              <img alt="" class="size-2.5" [src]="imgCheck" />
            }
          </div>
          <p class="font-['Instrument_Sans:Regular'] font-normal text-[#94a3b8] text-[12px] whitespace-nowrap" style="font-variation-settings: 'wdth' 100">
            Allow Extended Hours trading (EXT)
          </p>
        </button>

        <div 
          class="flex flex-col gap-2 items-start p-3 rounded-[6px] w-full border transition-colors"
          [ngStyle]="{
            'background-color': themeService.isDarkMode() ? '#080b0d' : '#f9fafb',
            'border-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb'
          }"
        >
          <div class="flex items-center justify-between w-full">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[12px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#64748b' : '#6b7280' }" style="font-variation-settings: 'wdth' 100">EST. VALUE</p>
            <p class="font-['Geist_Mono:SemiBold'] font-semibold text-[12px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }">{{ '$' + (estValue | number: '1.2-2') }}</p>
          </div>
          <div class="flex items-center justify-between w-full">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[12px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#64748b' : '#6b7280' }" style="font-variation-settings: 'wdth' 100">EST. FEES</p>
            <p class="font-['Geist_Mono:Regular'] font-normal text-[12px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#6b7280' }">$0.00 (COMMISSION-FREE)</p>
          </div>
          <div class="border-t w-full" [ngStyle]="{ 'border-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb' }"></div>
          <div class="flex items-center justify-between w-full">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[12px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#6b7280' }" style="font-variation-settings: 'wdth' 100">TOTAL COST</p>
            <p class="font-['Geist_Mono:Bold'] font-bold text-[13px] text-[#3e8914]">{{ '$' + (estValue | number: '1.2-2') }}</p>
          </div>
        </div>

        <button
          (click)="handleSubmit()"
          class="flex items-center justify-center p-3.5 rounded-[6px] w-full font-['Instrument_Sans:Bold'] font-bold text-[14px] text-white transition-all cursor-pointer"
          [ngClass]="submitted ? 'bg-[#1e252b] text-[#10b981]' : side === 'BUY' ? 'bg-[#1a9e29] hover:bg-[#22c55e] active:scale-[0.98]' : 'bg-[#dc2626] hover:bg-[#ef4444] active:scale-[0.98]'"
          style="font-variation-settings: 'wdth' 100"
        >
          {{ submitted ? "✓ ORDER SUBMITTED" : "PLACE " + side + " ORDER" }}
        </button>
      </div>
    </div>
  `,
})
export class OrderEntryComponent {
  protected readonly themeService = inject(ThemeService);
  @Input() defaultSymbol = "AAPL";

  side: Side = "BUY";
  orderType: OrderType = "LIMIT";
  symbol = this.defaultSymbol;
  shares = 100;
  limitPrice = 182.5;
  extHours = true;
  submitted = false;

  orderTypes: OrderType[] = ["LIMIT", "MARKET"];
  Math = Math;
  parseInt = parseInt;
  parseFloat = parseFloat;

  imgZap = `${assetPathPrefix}/54f02.svg`;
  imgCheck = `${assetPathPrefix}/20925.svg`;

  get estValue() {
    return this.shares * this.limitPrice;
  }

  handleSubmit() {
    this.submitted = true;
    setTimeout(() => (this.submitted = false), 2500);
  }
}
