import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import type { Position } from "../../data/mock-data";

const assetPathPrefix = "/assets";

@Component({
  selector: "app-open-positions",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-[#11161b] border border-[#1e252b] flex flex-col rounded-[8px] w-full">
      <div class="border-b border-[#1e252b] flex items-center justify-between px-4 py-3">
        <div class="flex gap-2 items-center">
          <img alt="" class="size-4" [src]="imgBriefcase" />
          <p class="font-['Instrument_Sans:SemiBold'] font-semibold text-[14px] text-white whitespace-nowrap" style="font-variation-settings: 'wdth' 100">
            OPEN POSITIONS
          </p>
        </div>
        <div class="flex gap-3 items-center">
          <div class="bg-[#1e252b] px-2 py-1 rounded-full">
            <p class="font-['Geist_Mono:Regular'] font-normal text-[#94a3b8] text-[11px]">{{ positions.length }} ACTIVE</p>
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

      <div class="bg-[#11161b] flex items-center px-4 py-2.5 font-['Instrument_Sans:SemiBold'] font-semibold text-[#64748b] text-[11px]" style="font-variation-settings: 'wdth' 100">
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
            class="border-b border-[#1e252b] flex items-center px-4 py-3 hover:bg-[#161d24] transition-colors"
            [ngClass]="idx % 2 === 0 ? 'bg-[#11161b]' : 'bg-[#080b0d]'"
          >
            <p class="font-['Geist_Mono:Bold'] font-bold text-[13px] text-white w-[80px]">{{ pos.symbol }}</p>
            <p class="font-['Geist_Mono:Regular'] font-normal text-[13px] text-white text-right w-[70px]">{{ pos.shares }}</p>
            <p class="font-['Geist_Mono:Regular'] font-normal text-[#94a3b8] text-[13px] text-right w-[90px]">
              {{ '$' + pos.avgCost.toFixed(2) }}
            </p>
            <p class="font-['Geist_Mono:Regular'] font-normal text-[13px] text-white text-right w-[90px]">
              {{ '$' + pos.lastPrice.toFixed(2) }}
            </p>
            <p class="font-['Geist_Mono:Regular'] font-normal text-[13px] text-white text-right w-[110px]">
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
  @Input({ required: true }) positions: Position[] = [];
  @Input() compact = true;

  imgBriefcase = `${assetPathPrefix}/fddf0.svg`;

  constructor(public router: Router) {}
}
