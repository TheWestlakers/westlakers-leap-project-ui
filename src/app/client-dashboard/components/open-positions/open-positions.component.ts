import { Component, Input, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import type { Position } from "../../data/mock-data";
import { ThemeService } from "../../../services/theme.service";

const assetPathPrefix = "/assets";

@Component({
  selector: "app-open-positions",
  standalone: true,
  imports: [CommonModule],
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
          <img alt="" class="size-4" [src]="imgBriefcase" />
          <p class="font-['Instrument_Sans:SemiBold'] font-semibold text-[14px] whitespace-nowrap" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }" style="font-variation-settings: 'wdth' 100">
            OPEN POSITIONS
          </p>
        </div>
        <div class="flex gap-3 items-center">
          <div [ngStyle]="{ 'background-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb' }" class="px-2 py-1 rounded-full">
            <p class="font-['Geist_Mono:Regular'] font-normal text-[11px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#6b7280' }">{{ positions.length }} ACTIVE</p>
          </div>
          @if (compact) {
            <button
              (click)="router.navigate(['/positions'])"
              class="font-['Instrument_Sans:SemiBold'] font-semibold text-[11px] text-[#3e8914] hover:text-[#10b981] transition-colors cursor-pointer"
              style="font-variation-settings: 'wdth' 100"
            >
              VIEW ALL →
            </button>
          }
        </div>
      </div>

      <div 
        class="flex items-center px-4 py-2.5 font-['Instrument_Sans:SemiBold'] font-semibold text-[11px] transition-colors" 
        [ngStyle]="{
          'background-color': themeService.isDarkMode() ? '#11161b' : '#e5e7eb',
          'color': themeService.isDarkMode() ? '#64748b' : '#6b7280'
        }"
        style="font-variation-settings: 'wdth' 100"
      >
        <span class="w-[80px]">SYMBOL</span>
        <span class="w-[70px] text-right">SHARES</span>
        <span class="w-[90px] text-right">AVG COST</span>
        <span class="w-[90px] text-right">LAST PRICE</span>
        <span class="w-[110px] text-right">MKT VALUE</span>
        <span class="flex-1 text-right">UNREALIZED P&amp;L</span>
      </div>

      <div [ngClass]="compact ? 'flex flex-col max-h-[240px] overflow-y-auto' : 'flex flex-col'">
        @for (pos of positions; track pos.id; let idx = $index) {
          <div
            class="border-b flex items-center px-4 py-3 transition-colors"
            [ngStyle]="{
              'border-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db',
              'background-color': idx % 2 === 0 
                ? (themeService.isDarkMode() ? '#11161b' : '#f9fafb')
                : (themeService.isDarkMode() ? '#080b0d' : '#ffffff'),
            }"
            [ngClass]="{'hover:bg-opacity-80': true}"
          >
            <p class="font-['Geist_Mono:Bold'] font-bold text-[13px] w-[80px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }">{{ pos.symbol }}</p>
            <p class="font-['Geist_Mono:Regular'] font-normal text-[13px] text-right w-[70px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }">{{ pos.shares }}</p>
            <p class="font-['Geist_Mono:Regular'] font-normal text-[13px] text-right w-[90px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#6b7280' }">
              {{ '$' + pos.avgCost.toFixed(2) }}
            </p>
            <p class="font-['Geist_Mono:Regular'] font-normal text-[13px] text-right w-[90px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }">
              {{ '$' + pos.lastPrice.toFixed(2) }}
            </p>
            <p class="font-['Geist_Mono:Regular'] font-normal text-[13px] text-right w-[110px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }">
              {{ '$' + (pos.marketValue | number: '1.2-2') }}
            </p>
            <div class="flex-1 flex justify-end">
              <p
                class="font-['Geist_Mono:SemiBold'] font-semibold text-[13px] whitespace-nowrap"
                [ngClass]="pos.unrealizedPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'"
              >
                {{ pos.unrealizedPnl >= 0 ? "+" : "" }}{{ pos.unrealizedPnl | number: '1.2-2' }} ({{ pos.unrealizedPct >= 0 ? "+" : "" }}{{ pos.unrealizedPct.toFixed(2) }}%)
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class OpenPositionsComponent {
  protected readonly themeService = inject(ThemeService);
  @Input({ required: true }) positions: Position[] = [];
  @Input() compact = true;

  imgBriefcase = `${assetPathPrefix}/fddf0.svg`;

  constructor(public router: Router) {}
}
