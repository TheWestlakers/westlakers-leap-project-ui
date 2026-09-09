import { Component, ElementRef, afterRenderEffect, signal, viewChild, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { aiAssistantReplies } from "../../data/mock-data";
import { ThemeService } from "../../../services/theme.service";

interface ChatMessage {
  sender: "bot" | "user";
  text: string;
  time: string;
}

@Component({
  selector: "app-ai-assistant",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="border flex flex-col rounded-[8px] w-full h-full min-h-0 overflow-hidden transition-colors"
      [ngStyle]="{
        'background-color': themeService.isDarkMode() ? '#11161b' : '#ffffff',
        'border-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb'
      }"
    >
      <div 
        class="border-b flex items-center gap-2 px-4 py-3 shrink-0 transition-colors"
        [ngStyle]="{ 'border-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb' }"
      >
        <span class="flex items-center justify-center size-6 rounded-full bg-[rgba(62,137,20,0.15)] text-[#3e8914] text-[13px]">✦</span>
        <p class="font-['Instrument_Sans:SemiBold'] font-semibold text-[14px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#ffffff' : '#111827' }" style="font-variation-settings: 'wdth' 100">
          AI ASSISTANT
        </p>
        <span class="ml-auto flex items-center gap-1.5">
          <span class="size-1.5 rounded-full bg-[#10b981]"></span>
          <span class="font-['Instrument_Sans:Regular'] font-normal text-[11px]" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#64748b' : '#6b7280' }" style="font-variation-settings: 'wdth' 100">Online</span>
        </span>
      </div>

      <div #scrollEl class="flex flex-col gap-3 p-3 overflow-y-auto flex-1 min-h-0">
        @for (msg of messages(); track $index) {
          <div class="flex flex-col gap-1" [ngClass]="msg.sender === 'user' ? 'items-end' : 'items-start'">
            <div
              class="px-3 py-2 rounded-[10px] max-w-[85%] font-['Instrument_Sans:Regular'] font-normal text-[12px] leading-snug border transition-colors"
              [ngStyle]="msg.sender === 'user' ? 
                {
                  'background-color': '#3e8914',
                  'color': '#ffffff',
                  'border-color': '#3e8914'
                } 
                : {
                  'background-color': themeService.isDarkMode() ? '#080b0d' : '#f3f4f6',
                  'border-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb',
                  'color': themeService.isDarkMode() ? '#e2e8f0' : '#111827'
                }"
              [ngClass]="msg.sender === 'user' ? 'rounded-br-[2px]' : 'rounded-bl-[2px]'"
              style="font-variation-settings: 'wdth' 100"
            >
              {{ msg.text }}
            </div>
            <span class="font-['Geist_Mono:Regular'] font-normal text-[10px] px-1" [ngStyle]="{ 'color': themeService.isDarkMode() ? '#64748b' : '#9ca3af' }">{{ msg.time }}</span>
          </div>
        }
        @if (isTyping()) {
          <div class="flex items-start">
            <div class="border rounded-[10px] rounded-bl-[2px] px-3 py-2 flex gap-1 items-center transition-colors" [ngStyle]="{
              'background-color': themeService.isDarkMode() ? '#080b0d' : '#f3f4f6',
              'border-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb'
            }">
              <span class="size-1.5 rounded-full animate-bounce" [ngStyle]="{ 'background-color': themeService.isDarkMode() ? '#64748b' : '#d1d5db' }" style="animation-delay: 0ms"></span>
              <span class="size-1.5 rounded-full animate-bounce" [ngStyle]="{ 'background-color': themeService.isDarkMode() ? '#64748b' : '#d1d5db' }" style="animation-delay: 120ms"></span>
              <span class="size-1.5 rounded-full animate-bounce" [ngStyle]="{ 'background-color': themeService.isDarkMode() ? '#64748b' : '#d1d5db' }" style="animation-delay: 240ms"></span>
            </div>
          </div>
        }
      </div>

      <div 
        class="border-t flex gap-2 items-center p-3 shrink-0 transition-colors"
        [ngStyle]="{ 'border-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb' }"
      >
        <input
          class="border flex-1 rounded-[6px] px-3 py-2 font-['Instrument_Sans:Regular'] font-normal text-[12px] outline-none focus:border-[#3e8914] transition-colors"
          [ngStyle]="{
            'background-color': themeService.isDarkMode() ? '#080b0d' : '#f9fafb',
            'border-color': themeService.isDarkMode() ? '#1e252b' : '#e5e7eb',
            'color': themeService.isDarkMode() ? '#ffffff' : '#111827'
          }"
          placeholder="Ask about your portfolio..."
          [ngModel]="draft()"
          (ngModelChange)="draft.set($event)"
          (keydown.enter)="sendMessage()"
        />
        <button
          (click)="sendMessage()"
          class="flex items-center justify-center size-8 rounded-[6px] bg-[#3e8914] hover:bg-[#4ea31a] transition-colors cursor-pointer shrink-0"
        >
          <span class="text-white text-[13px]">➤</span>
        </button>
      </div>
    </div>
  `,
})
export class AiAssistantComponent {
  protected readonly themeService = inject(ThemeService);
  
  draft = signal("");
  isTyping = signal(false);
  private replyIndex = 0;
  private scrollEl = viewChild<ElementRef<HTMLDivElement>>("scrollEl");

  messages = signal<ChatMessage[]>([
    { sender: "bot", text: "Hi! I'm your AI trading assistant. Ask me about your portfolio, positions, or market prices.", time: this.now() },
  ]);

  constructor() {
    afterRenderEffect(() => {
      // Access signals to track changes
      this.messages();
      this.isTyping();
      
      // Scroll to bottom after DOM update
      this.scrollToBottom();
    });
  }

  private scrollToBottom(): void {
    const el = this.scrollEl()?.nativeElement;
    if (el) {
      // Use requestAnimationFrame to ensure DOM has been fully updated
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }

  sendMessage() {
    const text = this.draft().trim();
    if (!text) return;

    this.messages.update((msgs) => [...msgs, { sender: "user", text, time: this.now() }]);
    this.draft.set("");
    // Scroll after user message is added
    this.scrollToBottom();
    
    this.isTyping.set(true);

    const reply = aiAssistantReplies[this.replyIndex % aiAssistantReplies.length];
    this.replyIndex++;

    setTimeout(() => {
      this.isTyping.set(false);
      this.messages.update((msgs) => [...msgs, { sender: "bot", text: reply, time: this.now() }]);
      // Scroll after bot reply is added
      this.scrollToBottom();
    }, 900);
  }

  private now(): string {
    return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
}
