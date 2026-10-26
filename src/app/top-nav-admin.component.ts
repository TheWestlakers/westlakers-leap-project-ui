import { Component, computed, ElementRef, HostListener, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { AuthService } from "./services/auth.service";
import { Theme, ThemeService } from "./services/theme.service";

const assetPathPrefix = "/assets";

@Component({
  selector: "app-top-nav",
  standalone: true,
  imports: [CommonModule],
  styleUrl: "./top-nav.component.css",
  template: `
    <div [class.light-theme]="!isDarkMode()" class="top-nav-container bg-[#11161b] border-b border-[#1e252b] flex h-16 items-center justify-between px-6 shrink-0 w-full gap-4">
      <div class="flex gap-3 items-center flex-shrink-0">
        <div class="bg-[#3e8914] flex items-center justify-center rounded-[6px] size-7">
          <img alt="" class="size-4" [src]="imgCircleX" />
        </div>
        <div class="flex flex-col gap-px items-start">
          <p class="font-['Instrument_Sans'] font-bold text-[15px] text-white whitespace-nowrap tracking-[0.04em]" style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100">
            PAYSPRINT
          </p>
          <p class="font-['Instrument_Sans'] font-semibold text-[#3e8914] text-[10px] tracking-[0.05em]" style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100">
            SYSTEM PORTAL
          </p>
        </div>
      </div>

      <div class="flex gap-5 items-center flex-shrink-0">
        <div class="bg-[#1e252b] h-7 w-px"></div>
        <div class="relative">
          <div class="flex gap-2.5 items-center cursor-pointer" (click)="toggleMenu()">
            <div class="bg-[#3e8914] flex items-center justify-center rounded-full size-8">
              <p class="font-['Instrument_Sans'] font-bold text-[12px] text-white tracking-[0.02em]" style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100">
                {{ profileInitials() }}
              </p>
            </div>
            <p class="font-['Instrument_Sans'] font-semibold text-[13px] text-white whitespace-nowrap" style="font-family: 'Instrument Sans', system-ui, sans-serif; font-variation-settings: 'wdth' 100">
              {{ profileName() }}
            </p>
            <img alt="" class="size-3" [src]="imgChevronDown" />
          </div>

          @if (isMenuOpen()) {
            <div class="absolute right-0 top-11 z-10 w-48 rounded-[6px] border border-[#1e252b] bg-[#11161b] py-1 shadow-lg">
              <div class="px-3 py-2 font-['Instrument_Sans'] text-[13px] text-white" style="font-family: 'Instrument Sans', system-ui, sans-serif">
                <span class="mb-1.5 block">Theme</span>
                <div role="radiogroup" aria-label="Theme" class="flex rounded-[6px] border border-[#1e252b] p-0.5">
                  @for (option of themeOptions; track option.value) {
                    <button
                      type="button"
                      role="radio"
                      [attr.aria-checked]="theme() === option.value"
                      (click)="setTheme(option.value)"
                      class="flex-1 rounded-[4px] px-1 py-1 text-[12px] font-semibold transition-colors"
                      [class.bg-[#3e8914]]="theme() === option.value"
                      [class.text-white]="theme() === option.value"
                      [class.text-[#94a3b8]]="theme() !== option.value"
                      [class.hover:bg-[#1e252b]]="theme() !== option.value"
                    >
                      {{ option.label }}
                    </button>
                  }
                </div>
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
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  private readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);

  protected readonly isMenuOpen = signal(false);
  protected readonly isDarkMode = this.themeService.isDarkMode;
  protected readonly theme = this.themeService.theme;
  protected readonly profileInitials = computed(() => this.authService.isAdmin() ? 'AD' : this.authService.initials());
  protected readonly profileName = computed(() => this.authService.isAdmin() ? 'Admin' : this.authService.displayName());
  protected readonly themeOptions: { value: Theme; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'lakers', label: 'Lakers' },
  ];

  imgCircleX = `${assetPathPrefix}/ed609.svg`;
  imgChevronDown = `${assetPathPrefix}/76166.svg`;

  protected toggleMenu(): void {
    this.isMenuOpen.update((value) => !value);
  }

  @HostListener("document:click", ["$event"])
  protected closeMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isMenuOpen.set(false);
    }
  }

  protected setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  protected logout(): void {
    this.isMenuOpen.set(false);
    this.router.navigateByUrl('/logout');
  }
}
