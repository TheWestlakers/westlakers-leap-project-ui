import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TopNavComponent } from "../../components/top-nav/top-nav.component";
import { WatchlistComponent } from "../../components/watchlist/watchlist.component";
import { PortfolioChartComponent } from "../../components/portfolio-chart/portfolio-chart.component";
import { OpenPositionsComponent } from "../../components/open-positions/open-positions.component";
import { OrderEntryComponent } from "../../components/order-entry/order-entry.component";
import { AiAssistantComponent } from "../../components/ai-assistant/ai-assistant.component";
import { initialWatchlist, positions } from "../../data/mock-data";
import type { WatchlistItem } from "../../data/mock-data";
import { ThemeService } from "../../../services/theme.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, TopNavComponent, WatchlistComponent, PortfolioChartComponent, OpenPositionsComponent, OrderEntryComponent, AiAssistantComponent],
  styleUrl: '../../client-dashboard.css',
  template: `
    <div 
      class="flex flex-col min-h-screen transition-colors"
      [ngStyle]="{ 'background-color': themeService.isDarkMode() ? '#080b0d' : '#ffffff' }"
    >
      <app-top-nav [netLiqValue]="totalAccountValue" />

      <div class="flex gap-6 items-start p-6 w-full">
        <!-- Left rail -->
        <div class="flex flex-col gap-4 items-start shrink-0 w-[260px]">
          <div 
            class="border flex flex-col gap-2 items-start p-4 rounded-[8px] w-full transition-colors"
            [ngStyle]="{
              'background-color': themeService.isDarkMode() ? '#11161b' : '#f3f4f6',
              'border-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db'
            }"
          >
            <p 
              class="font-['Instrument_Sans:Regular'] font-normal text-[11px]" 
              style="font-variation-settings: 'wdth' 100"
              [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#4b5563' }"
            >
              TOTAL ACCOUNT VALUE
            </p>
            <div class="flex gap-3 items-baseline w-full">
              <p class="font-['Geist_Mono:Bold'] font-bold text-[22px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }">
                {{ '$' + (totalAccountValue | number: '1.2-2') }}
              </p>
              <p class="font-['Geist_Mono:SemiBold'] font-semibold text-[#10b981] text-[12px]">+{{ dayChangePct }}%</p>
            </div>
          </div>

          <div 
            class="border flex flex-col gap-2 items-start p-4 rounded-[8px] w-full transition-colors"
            [ngStyle]="{
              'background-color': themeService.isDarkMode() ? '#11161b' : '#f3f4f6',
              'border-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db'
            }"
          >
            <p 
              class="font-['Instrument_Sans:Regular'] font-normal text-[11px]" 
              style="font-variation-settings: 'wdth' 100"
              [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#4b5563' }"
            >
              AVAILABLE BUYING POWER
            </p>
            <div class="flex gap-3 items-baseline w-full">
              <p class="font-['Geist_Mono:Bold'] font-bold text-[22px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }">
                {{ '$' + (buyingPower | number: '1.2-2') }}
              </p>
              <p 
                class="font-['Instrument_Sans:Regular'] font-normal text-[11px]" 
                style="font-variation-settings: 'wdth' 100"
                [ngStyle]="{ 'color': themeService.isDarkMode() ? '#64748b' : '#6b7280' }"
              >
                MARGIN x2.0
              </p>
            </div>
          </div>

          <div 
            class="border flex flex-col gap-2 items-start p-4 rounded-[8px] w-full transition-colors"
            [ngStyle]="{
              'background-color': themeService.isDarkMode() ? '#11161b' : '#f3f4f6',
              'border-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db'
            }"
          >
            <p 
              class="font-['Instrument_Sans:Regular'] font-normal text-[11px] whitespace-nowrap" 
              style="font-variation-settings: 'wdth' 100"
              [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#4b5563' }"
            >
              TODAY'S CHANGE (P&amp;L)
            </p>
            <div class="flex gap-3 items-baseline w-full">
              <p class="font-['Geist_Mono:Bold'] font-bold text-[22px] text-[#10b981]">
                {{ '+$' + (dayChange | number: '1.2-2') }}
              </p>
              <div [ngStyle]="{ 'background-color': themeService.isDarkMode() ? 'rgba(16,185,129,0.1)' : '#dcfce7' }" class="px-1.5 py-0.5 rounded-[4px]">
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
  protected readonly themeService = inject(ThemeService);

  watchlist: WatchlistItem[] = initialWatchlist;
  positions = positions;

  totalAccountValue = 248512.9;
  buyingPower = 94210.45;
  dayChange = 3480.12;
  dayChangePct = 1.42;
}
