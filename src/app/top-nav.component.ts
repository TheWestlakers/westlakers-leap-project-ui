import { Component, ElementRef, HostListener, EventEmitter, Input, Output, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from "rxjs";
import { ThemeService } from "./services/theme.service";
import { AuthService } from "./services/auth.service";
import { Instrument, TradeService } from "./services/trade.service";

const assetPathPrefix = "/assets";

@Component({
  selector: "app-top-nav",
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: "./top-nav.component.css",
  template: `
    <div [class.light-theme]="!isDarkMode()" class="top-nav-container bg-[#11161b] border-b border-[#1e252b] grid h-16 grid-cols-[1fr_auto_1fr] items-center px-6 shrink-0 w-full gap-4">
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
      </div>

      <div class="relative bg-[#080b0d] border border-[#1e252b] flex gap-2 items-center px-3 py-2 rounded-[6px] w-[340px] flex-shrink-0">
        <img alt="" class="shrink-0 size-4" [src]="imgSearch" />
        <input
          class="flex-1 bg-transparent font-['Instrument_Sans'] font-normal text-[#94a3b8] text-[13px] outline-none placeholder:text-[#64748b]"
          placeholder="Enter symbol, company, or order hotkey..."
          [ngModel]="searchValue"
          (ngModelChange)="onSearchValueChange($event)"
          (keydown.enter)="submitSearch()"
          style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100"
        />
        <button
          type="button"
          (click)="submitSearch()"
          class="bg-[#1e252b] border border-[#2d3748] px-2 py-1 rounded-[4px] font-['Instrument_Sans'] font-semibold text-[#94a3b8] text-[10px] hover:text-white transition-colors"
          style="font-family: 'Instrument Sans', system-ui, sans-serif"
        >
          Enter
        </button>
        @if (searchValue.trim() && (searchResults.length || isSearching)) {
          <div class="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto rounded-[6px] border border-[#1e252b] bg-[#11161b] shadow-xl">
            @if (isSearching) {
              <div class="px-3 py-2 text-[12px] text-[#64748b]">Searching...</div>
            }
            @for (instrument of searchResults; track instrument.instrumentId) {
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 border-b border-[#1e252b] px-3 py-2 text-left last:border-b-0 hover:bg-[#1e252b]"
                (click)="selectInstrument(instrument)"
              >
                <span class="min-w-0">
                  <strong class="block truncate text-[12px] text-white">{{ instrument.ticker }}</strong>
                  <span class="block truncate text-[11px] text-[#94a3b8]">{{ instrument.name }}</span>
                </span>
                <span class="shrink-0 text-[10px] uppercase text-[#64748b]">Instrument</span>
              </button>
            }
          </div>
        }
      </div>

      <div class="flex gap-5 items-center flex-shrink-0 justify-self-end">
        <div class="relative">
          <div class="flex gap-2.5 items-center cursor-pointer" (click)="toggleMenu()">
            <div class="bg-[#3e8914] flex items-center justify-center rounded-full size-8">
              <p class="font-['Instrument_Sans'] font-bold text-[12px] text-white tracking-[0.02em]" style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100">
                {{ initials() }}
              </p>
            </div>
            <p class="font-['Instrument_Sans'] font-semibold text-[13px] text-white whitespace-nowrap" style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100">
              {{ displayName() }}
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
              <div class="flex w-full items-center justify-between px-3 py-2 font-['Instrument_Sans'] text-[13px] text-white" style="font-family: 'Instrument Sans', system-ui, sans-serif">
                <span>Lebron mode</span>
                <button
                  type="button"
                  role="switch"
                  [attr.aria-checked]="isLebronMode()"
                  aria-label="Toggle Lebron mode"
                  (click)="toggleLebronMode()"
                  class="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                  [class.bg-[#3e8914]]="isLebronMode()"
                  [class.bg-[#4b5563]]="!isLebronMode()"
                >
                  <span
                    class="absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform"
                    [class.translate-x-4]="isLebronMode()"
                    [class.translate-x-0]="!isLebronMode()"
                  ></span>
                </button>
              </div>
              @if (showPowerView) {
                <div class="flex w-full items-center justify-between px-3 py-2 font-['Instrument_Sans'] text-[13px] text-white" style="font-family: 'Instrument Sans', system-ui, sans-serif">
                <span>Power view</span>
                <button
                  type="button"
                  role="switch"
                  [attr.aria-checked]="isPowerView()"
                  aria-label="Toggle power view"
                  (click)="togglePowerView()"
                  class="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                  [class.bg-[#3e8914]]="isPowerView()"
                  [class.bg-[#4b5563]]="!isPowerView()"
                >
                  <span
                    class="absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform"
                    [class.translate-x-4]="isPowerView()"
                    [class.translate-x-0]="!isPowerView()"
                  ></span>
                </button>
              </div>
              }
              <div class="mx-2 my-1 h-px bg-[#1e252b]"></div>
              <button
                type="button"
                (click)="goToOrderHistory()"
                class="w-full px-3 py-2 text-left font-['Instrument_Sans'] text-[13px] text-white hover:bg-[#1e252b] transition-colors" style="font-family: 'Instrument Sans', system-ui, sans-serif"
              >
                Order history
              </button>
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
export class TopNavComponent implements OnInit, OnDestroy {
  @Input({ required: true }) netLiqValue!: number;
  @Input() searchValue = "";
  @Output() searchValueChange = new EventEmitter<string>();
  @Output() searchSubmit = new EventEmitter<void>();
  @Input() showPowerView = false;

  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  protected readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly tradeService = inject(TradeService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchQuery$ = new Subject<string>();

  searchResults: Instrument[] = [];
  isSearching = false;

  searchVal = "";

  protected readonly displayName = this.authService.displayName;
  protected readonly initials = this.authService.initials;

  protected readonly isMenuOpen = signal(false);
  protected readonly isDarkMode = this.themeService.isDarkMode;
  protected readonly isLebronMode = this.themeService.isLebronMode;
  protected readonly isPowerView = this.themeService.isPowerView;

  imgCircleX = `${assetPathPrefix}/ed609.svg`;
  imgSearch = `${assetPathPrefix}/56f25.svg`;
  imgBadgeAlert = `${assetPathPrefix}/bc443.svg`;
  imgChevronDown = `${assetPathPrefix}/76166.svg`;
  imgAvatar = `${assetPathPrefix}/5bbdb.png`;

  ngOnInit(): void {
    this.searchQuery$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query) {
            this.isSearching = false;
            return of([] as Instrument[]);
          }
          this.isSearching = true;
          return this.tradeService.searchInstruments(query).pipe(
            catchError(() => of([] as Instrument[])),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((results) => {
        this.searchResults = results.slice(0, 7);
        this.isSearching = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((value) => !value);
  }

  @HostListener("document:click", ["$event"])
  protected closeMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isMenuOpen.set(false);
    }
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  protected toggleLebronMode(): void {
    this.themeService.toggleLebronMode();
  }

  protected togglePowerView(): void {
    this.themeService.togglePowerView();
  }

  protected goToOrderHistory(): void {
    this.isMenuOpen.set(false);
    this.router.navigateByUrl('/transaction-history');
  }

  protected logout(): void {
    this.isMenuOpen.set(false);
    this.router.navigateByUrl('/logout');
  }

  protected submitSearch(): void {
    this.searchSubmit.emit();
  }

  protected onSearchValueChange(value: string): void {
    this.searchValueChange.emit(value);
    this.searchQuery$.next(value.trim());
  }

  protected selectInstrument(instrument: Instrument): void {
    this.searchValueChange.emit(instrument.ticker);
    this.searchResults = [];
    this.searchSubmit.emit();
  }
}
