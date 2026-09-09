import { Component, EventEmitter, Input, Output, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import type { WatchlistItem } from "../../data/mock-data";
import { ThemeService } from "../../../services/theme.service";

const assetPathPrefix = "/assets";
const sparklineMap: Record<string, string> = {
  c7672: `${assetPathPrefix}/c7672.svg`,
  ca052: `${assetPathPrefix}/ca052.svg`,
  "7fa04": `${assetPathPrefix}/7fa04.svg`,
  "63bc3": `${assetPathPrefix}/63bc3.svg`,
  "49fc6": `${assetPathPrefix}/49fc6.svg`,
};

@Component({
  selector: "app-watchlist",
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
          <img alt="" class="size-4" [src]="imgListTodo" />
          <p class="font-['Instrument_Sans:SemiBold'] font-semibold text-[14px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }" style="font-variation-settings: 'wdth' 100">
            WATCHLIST
          </p>
        </div>
        <button
          (click)="isEditing = !isEditing"
          class="font-['Instrument_Sans:Regular'] font-normal text-[12px] transition-colors cursor-pointer"
          [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#6b7280' }"
          style="font-variation-settings: 'wdth' 100"
        >
          {{ isEditing ? "Done" : "Edit (" + items.length + ")" }}
        </button>
      </div>

      <div class="flex flex-col">
        @for (item of items; track item.symbol + $index; let idx = $index) {
          <div
            class="border-b flex items-center justify-between px-4 py-3 group transition-colors"
            [ngStyle]="{
              'border-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db',
              'background-color': idx === 0 
                ? (themeService.isDarkMode() ? '#161d24' : '#f9fafb')
                : (themeService.isDarkMode() ? '' : '')
            }"
          >
            <div class="flex flex-col gap-0.5 items-start w-[70px]">
              <p class="font-['Geist_Mono:Bold'] font-bold text-[13px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }">{{ item.symbol }}</p>
              <p class="font-['Instrument_Sans:Regular'] font-normal text-[11px] truncate w-full overflow-hidden text-ellipsis" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#64748b' : '#374151' }" style="font-variation-settings: 'wdth' 100">
                {{ item.name }}
              </p>
            </div>
            <div class="h-6 w-[60px] relative overflow-hidden">
              <img alt="" class="absolute inset-0 size-full object-contain" [src]="sparklineMap[item.sparklineKey] ?? sparklineMap['c7672']" />
            </div>
            <div class="flex flex-col gap-0.5 items-end">
              <p class="font-['Geist_Mono:SemiBold'] font-semibold text-[13px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }">{{ item.price.toFixed(2) }}</p>
              <p
                class="font-['Geist_Mono:SemiBold'] font-semibold text-[11px]"
                [ngClass]="item.change >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'"
              >
                {{ item.change >= 0 ? "+" : "" }}{{ item.change.toFixed(2) }}%
              </p>
            </div>
            @if (isEditing) {
              <button
                (click)="removeItem(item.symbol)"
                class="ml-2 text-[#ef4444] hover:text-red-400 text-[16px] font-bold leading-none cursor-pointer"
                title="Remove"
              >
                ×
              </button>
            }
          </div>
        }
      </div>

      @if (isEditing) {
        <div class="p-3 flex flex-col gap-2 border-t border-[#1e252b]">
          <input
            class="bg-[#080b0d] border border-[#1e252b] rounded-[4px] px-2 py-1.5 font-['Geist_Mono:Regular'] text-[12px] text-white outline-none placeholder:text-[#64748b] focus:border-[#3e8914] transition-colors"
            placeholder="SYMBOL"
            [(ngModel)]="newSymbol"
            (keydown.enter)="addItem()"
          />
          <input
            class="bg-[#080b0d] border border-[#1e252b] rounded-[4px] px-2 py-1.5 font-['Instrument_Sans:Regular'] text-[12px] text-white outline-none placeholder:text-[#64748b] focus:border-[#3e8914] transition-colors"
            placeholder="Company name (optional)"
            [(ngModel)]="newName"
            (keydown.enter)="addItem()"
            style="font-variation-settings: 'wdth' 100"
          />
          <button
            (click)="addItem()"
            class="bg-[#1a9e29] hover:bg-[#22c55e] transition-colors rounded-[4px] py-1.5 font-['Instrument_Sans:Bold'] font-bold text-[12px] text-white cursor-pointer"
            style="font-variation-settings: 'wdth' 100"
          >
            + ADD TO WATCHLIST
          </button>
        </div>
      }
    </div>
  `,
})
export class WatchlistComponent {
  protected readonly themeService = inject(ThemeService);
  @Input({ required: true }) items: WatchlistItem[] = [];
  @Output() itemsChange = new EventEmitter<WatchlistItem[]>();

  isEditing = false;
  newSymbol = "";
  newName = "";

  imgListTodo = `${assetPathPrefix}/79fea.svg`;
  sparklineMap = sparklineMap;

  removeItem(symbol: string) {
    this.itemsChange.emit(this.items.filter((i) => i.symbol !== symbol));
  }

  addItem() {
    if (!this.newSymbol.trim()) return;
    const price = Math.round((100 + Math.random() * 400) * 100) / 100;
    const change = Math.round((Math.random() * 6 - 3) * 100) / 100;
    const keys = Object.keys(sparklineMap);
    this.itemsChange.emit([
      ...this.items,
      {
        symbol: this.newSymbol.toUpperCase().trim(),
        name: this.newName.trim() || this.newSymbol.toUpperCase().trim(),
        price,
        change,
        sparklineKey: keys[Math.floor(Math.random() * keys.length)],
      },
    ]);
    this.newSymbol = "";
    this.newName = "";
  }
}
