import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TopNavComponent } from "../../components/top-nav/top-nav.component";
import { WatchlistComponent } from "../../components/watchlist/watchlist.component";
import { PortfolioChartComponent } from "../../components/portfolio-chart/portfolio-chart.component";
import { OpenPositionsComponent } from "../../components/open-positions/open-positions.component";
import { OrderEntryComponent } from "../../components/order-entry/order-entry.component";
import { AiAssistantComponent } from "../../components/ai-assistant/ai-assistant.component";
import { initialWatchlist, positions } from "../../data/mock-data";
import type { WatchlistItem } from "../../data/mock-data";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, TopNavComponent, WatchlistComponent, PortfolioChartComponent, OpenPositionsComponent, OrderEntryComponent, AiAssistantComponent],
  styleUrl: '../../client-dashboard.css',
  template: `
    <div class="bg-[#080b0d] flex flex-col min-h-screen">
      <app-top-nav [netLiqValue]="totalAccountValue" />

      <div class="flex gap-6 items-start p-6 w-full">
        <!-- Left rail -->
        <div class="flex flex-col gap-4 items-start shrink-0 w-[260px]">
          <div class="bg-[#11161b] border border-[#1e252b] flex flex-col gap-2 items-start p-4 rounded-[8px] w-full">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[#94a3b8] text-[11px]" style="font-variation-settings: 'wdth' 100">
              TOTAL ACCOUNT VALUE
            </p>
            <div class="flex gap-3 items-baseline w-full">
              <p class="font-['Geist_Mono:Bold'] font-bold text-[22px] text-white">
                {{ '$' + (totalAccountValue | number: '1.2-2') }}
              </p>
              <p class="font-['Geist_Mono:SemiBold'] font-semibold text-[#10b981] text-[12px]">+{{ dayChangePct }}%</p>
            </div>
          </div>

          <div class="bg-[#11161b] border border-[#1e252b] flex flex-col gap-2 items-start p-4 rounded-[8px] w-full">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[#94a3b8] text-[11px]" style="font-variation-settings: 'wdth' 100">
              AVAILABLE BUYING POWER
            </p>
            <div class="flex gap-3 items-baseline w-full">
              <p class="font-['Geist_Mono:Bold'] font-bold text-[22px] text-white">
                {{ '$' + (buyingPower | number: '1.2-2') }}
              </p>
              <p class="font-['Instrument_Sans:Regular'] font-normal text-[#64748b] text-[11px]" style="font-variation-settings: 'wdth' 100">
                MARGIN x2.0
              </p>
            </div>
          </div>

          <div class="bg-[#11161b] border border-[#1e252b] flex flex-col gap-2 items-start p-4 rounded-[8px] w-full">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[#94a3b8] text-[11px] whitespace-nowrap" style="font-variation-settings: 'wdth' 100">
              TODAY'S CHANGE (P&amp;L)
            </p>
            <div class="flex gap-3 items-baseline w-full">
              <p class="font-['Geist_Mono:Bold'] font-bold text-[22px] text-[#10b981]">
                {{ '+$' + (dayChange | number: '1.2-2') }}
              </p>
              <div class="bg-[rgba(16,185,129,0.1)] px-1.5 py-0.5 rounded-[4px]">
                <p class="font-['Geist_Mono:Bold'] font-bold text-[#10b981] text-[11px]">▲ UP</p>
              </div>
            </div>
          </div>

          <app-watchlist [items]="watchlist" (itemsChange)="watchlist = $event" />
        </div>

        <!-- Center column -->
        <div class="flex flex-col gap-4 flex-1 min-w-0">
          <app-portfolio-chart />
          <app-open-positions [positions]="positions" [compact]="true" />
        </div>

        <!-- Right rail -->
        <div class="flex flex-col gap-4 shrink-0 w-[300px] self-stretch">
          <app-order-entry />
          <div class="h-[420px] min-h-0">
            <app-ai-assistant />
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  watchlist: WatchlistItem[] = initialWatchlist;
  positions = positions;

  totalAccountValue = 248512.9;
  buyingPower = 94210.45;
  dayChange = 3480.12;
  dayChangePct = 1.42;
}
