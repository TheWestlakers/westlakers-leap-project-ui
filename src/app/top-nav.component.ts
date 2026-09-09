import { Component, Input, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

const assetPathPrefix = "/assets";

@Component({
  selector: "app-top-nav",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-[#11161b] border-b border-[#1e252b] flex h-16 items-center justify-between px-6 shrink-0 w-full gap-4">
      <div class="flex gap-3 items-center flex-shrink-0">
        <div class="bg-[#3e8914] flex items-center justify-center rounded-[6px] size-7">
          <img alt="" class="size-4" [src]="imgCircleX" />
        </div>
        <div class="flex flex-col gap-px items-start">
          <p class="font-['Instrument_Sans'] font-bold text-[15px] text-white whitespace-nowrap tracking-[0.04em]" style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100">
            PAYSPRINT
          </p>
          <p class="font-['Instrument_Sans'] font-semibold text-[#3e8914] text-[10px] tracking-[0.05em]" style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100">
            ACTIVE TRADER
          </p>
        </div>
        <div class="bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.25)] flex gap-1.5 items-center px-2 py-1 rounded-[4px]">
          <img alt="" class="size-1.5" [src]="imgLiveDot" />
          <p class="font-['Instrument_Sans'] font-semibold text-[#10b981] text-[11px] uppercase tracking-[0.05em]" style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100">
            Live
          </p>
        </div>
      </div>

      <div class="bg-[#080b0d] border border-[#1e252b] flex gap-2 items-center px-3 py-2 rounded-[6px] w-[340px] flex-shrink-0">
        <img alt="" class="shrink-0 size-4" [src]="imgSearch" />
        <input
          class="flex-1 bg-transparent font-['Instrument_Sans'] font-normal text-[#94a3b8] text-[13px] outline-none placeholder:text-[#64748b]"
          placeholder="Enter symbol, company, or order hotkey..."
          [(ngModel)]="searchVal"
          style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100"
        />
        <div class="bg-[#1e252b] px-1.5 py-0.5 rounded-[4px]">
          <span class="font-['Geist_Mono'] font-normal text-[#94a3b8] text-[10px]" style="font-family: 'Geist Mono', 'Courier New', monospace">
            /
          </span>
        </div>
      </div>

      <div class="flex gap-5 items-center flex-shrink-0">
        <div class="flex flex-col gap-0.5 items-end">
          <p class="font-['Instrument_Sans'] font-normal text-[#64748b] text-[10px] tracking-[0.04em]" style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100">
            NET LIQ VALUE
          </p>
          <p class="font-['Geist_Mono'] font-semibold text-[14px] text-white" style="font-family: 'Geist Mono', 'Courier New', monospace">
            {{ '$' + (netLiqValue | number: '1.2-2') }}
          </p>
        </div>
        <button type="button" class="bg-[#080b0d] border border-[#1e252b] flex items-center justify-center rounded-full size-9 cursor-pointer hover:border-[#2d3748] transition-colors" aria-label="Notifications">
          <img alt="" class="size-[18px]" [src]="imgBadgeAlert" />
        </button>
        <div class="bg-[#1e252b] h-7 w-px"></div>
        <div class="relative">
          <div class="flex gap-2.5 items-center cursor-pointer" (click)="toggleMenu()">
            <img alt="" class="rounded-full size-8 object-cover" [src]="imgAvatar" />
            <p class="font-['Instrument_Sans'] font-semibold text-[13px] text-white whitespace-nowrap" style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100">
              F.Investments
            </p>
            <img alt="" class="size-3" [src]="imgChevronDown" />
          </div>

          @if (isMenuOpen()) {
            <div class="absolute right-0 top-11 z-10 w-48 rounded-[6px] border border-[#1e252b] bg-[#11161b] py-1 shadow-lg">
              <div class="flex w-full items-center justify-between px-3 py-2 font-['Instrument_Sans'] text-[13px] text-white" style="font-family: 'Instrument Sans', system-ui, sans-serif">
                <span>Dark mode</span>
                <button
                  type="button"
                  role="switch"
                  [attr.aria-checked]="isDarkMode()"
                  aria-label="Toggle dark mode"
                  (click)="toggleTheme()"
                  class="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                  [class.bg-[#3e8914]]="isDarkMode()"
                  [class.bg-[#4b5563]]="!isDarkMode()"
                >
                  <span
                    class="absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform"
                    [class.translate-x-4]="isDarkMode()"
                    [class.translate-x-0]="!isDarkMode()"
                  ></span>
                </button>
              </div>
              <div class="mx-2 my-1 h-px bg-[#1e252b]"></div>
              <button
                type="button"
                (click)="logout()"
                class="w-full px-3 py-2 text-left font-['Instrument_Sans'] text-[13px] text-red-500 hover:bg-[#1e252b] transition-colors" style="font-family: 'Instrument Sans', system-ui, sans-serif"
              >
                Log out
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class TopNavComponent {
  @Input({ required: true }) netLiqValue!: number;

  private readonly router = inject(Router);

  searchVal = "";

  protected readonly isMenuOpen = signal(false);
  protected readonly isDarkMode = signal(true);

  imgCircleX = `${assetPathPrefix}/ed609.svg`;
  imgLiveDot = `${assetPathPrefix}/2ea7c.svg`;
  imgSearch = `${assetPathPrefix}/56f25.svg`;
  imgBadgeAlert = `${assetPathPrefix}/bc443.svg`;
  imgChevronDown = `${assetPathPrefix}/76166.svg`;
  imgAvatar = `${assetPathPrefix}/5bbdb.png`;

  protected toggleMenu(): void {
    this.isMenuOpen.update((value) => !value);
  }

  protected toggleTheme(): void {
    this.isDarkMode.update((value) => !value);
  }

  protected logout(): void {
    this.isMenuOpen.set(false);
    this.router.navigateByUrl('/logout');
  }
}
