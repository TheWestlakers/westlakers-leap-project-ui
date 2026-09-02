import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { OpenPositionsComponent } from "../../components/open-positions/open-positions.component";
import { positions } from "../../data/mock-data";

@Component({
  selector: "app-positions",
  standalone: true,
  imports: [CommonModule, OpenPositionsComponent],
  template: `
    <div class="bg-[#080b0d] min-h-screen flex flex-col">
      <div class="bg-[#11161b] border-b border-[#1e252b] flex h-12 items-center px-6 gap-4">
        <button
          (click)="router.navigate(['/'])"
          class="font-['Instrument_Sans:SemiBold'] font-semibold text-[#94a3b8] text-[13px] hover:text-white transition-colors cursor-pointer flex items-center gap-2"
          style="font-variation-settings: 'wdth' 100"
        >
          ← DASHBOARD
        </button>
        <div class="bg-[#1e252b] h-5 w-px"></div>
        <p class="font-['Instrument_Sans:SemiBold'] font-semibold text-white text-[14px]" style="font-variation-settings: 'wdth' 100">
          OPEN POSITIONS — EXTENDED VIEW
        </p>
      </div>

      <div class="p-6 flex flex-col gap-4">
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-[#11161b] border border-[#1e252b] rounded-[8px] p-4 flex flex-col gap-1">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[#94a3b8] text-[11px]" style="font-variation-settings: 'wdth' 100">TOTAL MARKET VALUE</p>
            <p class="font-['Geist_Mono:Bold'] font-bold text-[22px] text-white">{{ '$' + (totalValue | number: '1.2-2') }}</p>
          </div>
          <div class="bg-[#11161b] border border-[#1e252b] rounded-[8px] p-4 flex flex-col gap-1">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[#94a3b8] text-[11px]" style="font-variation-settings: 'wdth' 100">TOTAL UNREALIZED P&amp;L</p>
            <div class="flex items-baseline gap-2">
              <p class="font-['Geist_Mono:Bold'] font-bold text-[22px]" [ngClass]="totalPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'">
                {{ totalPnl >= 0 ? "+" : "" }}{{ '$' + (totalPnlAbs | number: '1.2-2') }}
              </p>
              <p class="font-['Geist_Mono:SemiBold'] font-semibold text-[12px]" [ngClass]="totalPct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'">
                ({{ totalPct >= 0 ? "+" : "" }}{{ totalPct.toFixed(2) }}%)
              </p>
            </div>
          </div>
          <div class="bg-[#11161b] border border-[#1e252b] rounded-[8px] p-4 flex flex-col gap-1">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[#94a3b8] text-[11px]" style="font-variation-settings: 'wdth' 100">ACTIVE POSITIONS</p>
            <p class="font-['Geist_Mono:Bold'] font-bold text-[22px] text-white">{{ positions.length }}</p>
          </div>
        </div>

        <app-open-positions [positions]="positions" [compact]="false" />
      </div>
    </div>
  `,
})
export class PositionsComponent {
  positions = positions;

  totalValue = positions.reduce((s, p) => s + p.marketValue, 0);
  totalPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  totalPnlAbs = Math.abs(this.totalPnl);
  totalPct = (this.totalPnl / (this.totalValue - this.totalPnl)) * 100;

  constructor(public router: Router) {}
}
