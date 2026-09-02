import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

const assetPathPrefix = "/assets";

@Component({
  selector: "app-top-nav",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-[#11161b] border-b border-[#1e252b] flex h-16 items-center justify-between px-6 shrink-0 w-full">
      <div class="flex gap-4 items-center">
        <div class="bg-[#3e8914] flex items-center justify-center rounded-[6px] size-7">
          <img alt="" class="size-4" [src]="imgCircleX" />
        </div>
        <div class="flex flex-col gap-0.5 items-start">
          <p class="font-['Instrument_Sans:Bold'] font-bold text-[15px] text-white whitespace-nowrap" style="font-variation-settings: 'wdth' 100">
            PAYSPRINT
          </p>
          <p class="font-['Instrument_Sans:SemiBold'] font-semibold text-[#3e8914] text-[10px]" style="font-variation-settings: 'wdth' 100">
            ACTIVE TRADER
          </p>
        </div>
        <div class="bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] flex gap-1.5 items-center px-2 py-1 rounded-[4px]">
          <img alt="" class="size-1.5" [src]="imgLiveDot" />
          <p class="font-['Instrument_Sans:SemiBold'] font-semibold text-[#10b981] text-[11px] uppercase" style="font-variation-settings: 'wdth' 100">
            Live
          </p>
        </div>
      </div>

      <div class="bg-[#080b0d] border border-[#1e252b] flex gap-2 items-center px-3 py-2 rounded-[6px] w-[340px]">
        <img alt="" class="shrink-0 size-4" [src]="imgSearch" />
        <input
          class="flex-1 bg-transparent font-['Instrument_Sans:Regular'] font-normal text-[#94a3b8] text-[13px] outline-none placeholder:text-[#64748b]"
          placeholder="Enter symbol, company, or order hotkey..."
          [(ngModel)]="searchVal"
          style="font-variation-settings: 'wdth' 100"
        />
        <div class="bg-[#1e252b] px-1.5 py-0.5 rounded-[4px]">
          <span class="font-['Geist_Mono:Regular'] font-normal text-[#94a3b8] text-[10px]">/</span>
        </div>
      </div>

      <div class="flex gap-6 items-center">
        <div class="flex flex-col gap-0.5 items-end">
          <p class="font-['Instrument_Sans:Regular'] font-normal text-[#64748b] text-[11px]" style="font-variation-settings: 'wdth' 100">
            NET LIQ VALUE
          </p>
          <p class="font-['Geist_Mono:SemiBold'] font-semibold text-[14px] text-white">
            {{ '$' + (netLiqValue | number: '1.2-2') }}
          </p>
        </div>
        <div class="bg-[#080b0d] border border-[#1e252b] flex items-center justify-center rounded-[18px] size-9">
          <img alt="" class="size-[18px]" [src]="imgBadgeAlert" />
        </div>
        <div class="bg-[#1e252b] h-7 w-px"></div>
        <div class="flex gap-2.5 items-center cursor-pointer">
          <img alt="" class="rounded-full size-8 object-cover" [src]="imgAvatar" />
          <p class="font-['Instrument_Sans:SemiBold'] font-semibold text-[13px] text-white whitespace-nowrap" style="font-variation-settings: 'wdth' 100">
            F.Investments
          </p>
          <img alt="" class="size-3" [src]="imgChevronDown" />
        </div>
      </div>
    </div>
  `,
})
export class TopNavComponent {
  @Input({ required: true }) netLiqValue!: number;

  searchVal = "";

  imgCircleX = `${assetPathPrefix}/ed609.svg`;
  imgLiveDot = `${assetPathPrefix}/2ea7c.svg`;
  imgSearch = `${assetPathPrefix}/56f25.svg`;
  imgBadgeAlert = `${assetPathPrefix}/bc443.svg`;
  imgChevronDown = `${assetPathPrefix}/76166.svg`;
  imgAvatar = `${assetPathPrefix}/5bbdb.png`;
}
