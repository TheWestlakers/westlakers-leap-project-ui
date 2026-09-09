import { Component, Input, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { ThemeService } from "../../../services/theme.service";

const assetPathPrefix = "/assets";

@Component({
  selector: "app-top-nav",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="flex h-16 items-center justify-between px-6 shrink-0 w-full border-b transition-colors"
      [ngStyle]="{
        'background-color': themeService.isDarkMode() ? '#11161b' : '#f3f4f6',
        'border-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db'
      }"
    >
      <div class="flex gap-4 items-center">
        <div class="bg-[#3e8914] flex items-center justify-center rounded-[6px] size-7">
          <img alt="" class="size-4" [src]="imgCircleX" />
        </div>
        <div class="flex flex-col gap-0.5 items-start">
          <p class="font-['Instrument_Sans:Bold'] font-bold text-[15px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }" style="font-variation-settings: 'wdth' 100">
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

      <div 
        class="flex gap-2 items-center px-3 py-2 rounded-[6px] w-[340px] border transition-colors"
        [ngStyle]="{
          'background-color': themeService.isDarkMode() ? '#080b0d' : '#ffffff',
          'border-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db'
        }"
      >
        <img alt="" class="shrink-0 size-4" [src]="imgSearch" />
        <input
          class="flex-1 bg-transparent font-['Instrument_Sans:Regular'] font-normal text-[13px] outline-none"
          placeholder="Enter symbol, company, or order hotkey..."
          [(ngModel)]="searchVal"
          [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#111827' }"
          style="font-variation-settings: 'wdth' 100"
        />
        <div [ngStyle]="{ 'background-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb' }" class="px-1.5 py-0.5 rounded-[4px]">
          <span class="font-['Geist_Mono:Regular'] font-normal text-[10px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#94a3b8' : '#6b7280' }">/</span>
        </div>
      </div>

      <div class="flex gap-6 items-center">
        <div class="flex flex-col gap-0.5 items-end">
          <p class="font-['Instrument_Sans:Regular'] font-normal text-[11px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#64748b' : '#6b7280' }" style="font-variation-settings: 'wdth' 100">
            NET LIQ VALUE
          </p>
          <p class="font-['Geist_Mono:SemiBold'] font-semibold text-[14px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }">
            {{ '$' + (netLiqValue | number: '1.2-2') }}
          </p>
        </div>
        <div 
          class="flex items-center justify-center rounded-[18px] size-9 border transition-colors"
          [ngStyle]="{
            'background-color': themeService.isDarkMode() ? '#080b0d' : '#ffffff',
            'border-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db'
          }"
        >
          <img alt="" class="size-[18px]" [src]="imgBadgeAlert" />
        </div>
        <div [ngStyle]="{ 'background-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db' }" class="h-7 w-px"></div>
        <div class="relative">
          <div class="flex gap-2.5 items-center cursor-pointer" (click)="toggleMenu()">
            <img alt="" class="rounded-full size-8 object-cover" [src]="imgAvatar" />
            <p class="font-['Instrument_Sans:SemiBold'] font-semibold text-[13px] whitespace-nowrap" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }" style="font-variation-settings: 'wdth' 100">
              F.Investments
            </p>
            <img alt="" class="size-3" [src]="imgChevronDown" />
          </div>

          @if (isMenuOpen()) {
            <div 
              class="absolute right-0 top-11 z-10 w-48 rounded-[6px] border py-1 shadow-lg transition-colors"
              [ngStyle]="{
                'background-color': themeService.isDarkMode() ? '#11161b' : '#ffffff',
                'border-color': themeService.isDarkMode() ? '#1e252b' : '#d1d5db'
              }"
            >
              <div class="flex w-full items-center justify-between px-3 py-2 font-['Instrument_Sans:Regular'] text-[13px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }">
                <span>Dark mode</span>
                <button
                  type="button"
                  role="switch"
                  [attr.aria-checked]="themeService.isDarkMode()"
                  aria-label="Toggle dark mode"
                  (click)="themeService.toggleTheme()"
                  class="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                  [class.bg-[#3e8914]]="themeService.isDarkMode()"
                  [class.bg-[#4b5563]]="!themeService.isDarkMode()"
                >
                  <span
                    class="absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform"
                    [class.translate-x-4]="themeService.isDarkMode()"
                    [class.translate-x-0]="!themeService.isDarkMode()"
                  ></span>
                </button>
              </div>
              <div [ngStyle]="{ 'background-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb' }" class="mx-2 my-1 h-px"></div>
              <button
                type="button"
                (click)="logout()"
                class="w-full px-3 py-2 text-left font-['Instrument_Sans:Regular'] text-[13px] text-red-500 hover:bg-opacity-50 transition-colors"
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
  protected readonly themeService = inject(ThemeService);

  searchVal = "";

  protected readonly isMenuOpen = signal(false);

  imgCircleX = `${assetPathPrefix}/ed609.svg`;
  imgLiveDot = `${assetPathPrefix}/2ea7c.svg`;
  imgSearch = `${assetPathPrefix}/56f25.svg`;
  imgBadgeAlert = `${assetPathPrefix}/bc443.svg`;
  imgChevronDown = `${assetPathPrefix}/76166.svg`;
  imgAvatar = `${assetPathPrefix}/5bbdb.png`;

  protected toggleMenu(): void {
    this.isMenuOpen.update((value) => !value);
  }

  protected logout(): void {
    this.isMenuOpen.set(false);
    this.router.navigateByUrl('/logout');
  }
}
