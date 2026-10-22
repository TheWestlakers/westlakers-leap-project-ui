import { Component, ElementRef, afterRenderEffect, signal, viewChild, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ThemeService } from "../../services/theme.service";
import { AiAssistantService, AssistantQuestion } from "../../services/ai-assistant.service";

interface ChatMessage {
  sender: "bot" | "user";
  text: string;
  time: string;
}

@Component({
  selector: "app-ai-assistant",
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: "./ai-assistant.component.css",
  host: { '[class.light-theme]': '!themeService.isDarkMode()' },
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      --font-mono:   'Geist Mono', 'Courier New', monospace;
      --font-sans:   'Instrument Sans', system-ui, sans-serif;
    }
  `,
  template: `
    <div [class.light-theme]="!themeService.isDarkMode()" class="ai-assistant-container bg-[#11161b] border border-[#1e252b] flex flex-col rounded-[8px] w-full h-full min-h-0 overflow-hidden">
      <div class="border-b border-[#1e252b] flex items-center gap-2 px-4 py-3 shrink-0">
        <span class="flex items-center justify-center size-6 rounded-full bg-[rgba(62,137,20,0.15)] text-[#3e8914] text-[13px]">✦</span>
        <p class="font-semibold text-[14px] text-white" style="font-family: var(--font-sans); font-weight: 600">
          AI ASSISTANT
        </p>
      </div>

      <div #scrollEl class="ai-chat-scroll flex flex-col gap-3 p-3 overflow-y-auto flex-1 min-h-0">
        @for (msg of messages(); track $index) {
          <div class="flex flex-col gap-1" [ngClass]="msg.sender === 'user' ? 'items-end' : 'items-start'">
            <div
              class="px-3 py-2 rounded-[10px] max-w-[85%] font-normal text-[12px] leading-snug"
              [ngClass]="msg.sender === 'user' ? 'bg-[#3e8914] text-white rounded-br-[2px]' : 'bg-[#080b0d] border border-[#1e252b] text-[#e2e8f0] rounded-bl-[2px]'"
              style="font-family: var(--font-sans)"
            >
              {{ msg.text }}
            </div>
            <span class="font-normal text-[#64748b] text-[10px] px-1" style="font-family: var(--font-mono)">{{ msg.time }}</span>
          </div>
        }
        @if (isTyping()) {
          <div class="flex items-start">
            <div class="bg-[#080b0d] border border-[#1e252b] rounded-[10px] rounded-bl-[2px] px-3 py-2 flex gap-1 items-center">
              <span class="size-1.5 rounded-full bg-[#64748b] animate-bounce" style="animation-delay: 0ms"></span>
              <span class="size-1.5 rounded-full bg-[#64748b] animate-bounce" style="animation-delay: 120ms"></span>
              <span class="size-1.5 rounded-full bg-[#64748b] animate-bounce" style="animation-delay: 240ms"></span>
            </div>
          </div>
        }
      </div>

      <div class="flex flex-wrap gap-1.5 px-3 pb-3 shrink-0">
        @for (question of questions; track question.id) {
          <button
            type="button"
            (click)="askQuestion(question)"
            [disabled]="isTyping()"
            class="border border-[#2b363e] rounded-[5px] px-2 py-1 font-normal text-[11px] text-[#a7b3be] hover:border-[#3e8914] hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
            style="font-family: var(--font-sans)"
          >
            {{ question.label }}
          </button>
        }
      </div>

      <div class="border-t border-[#1e252b] flex gap-2 items-center p-3 shrink-0">
        <input
          class="bg-[#080b0d] border border-[#1e252b] flex-1 rounded-[6px] px-3 py-2 font-normal text-[12px] text-white outline-none focus:border-[#3e8914] transition-colors"
          placeholder="Ask a general trading question..."
          style="font-family: var(--font-sans)"
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
  private readonly assistantService = inject(AiAssistantService);
  draft = signal("");
  isTyping = signal(false);
  private scrollEl = viewChild<ElementRef<HTMLDivElement>>("scrollEl");

  readonly questions: AssistantQuestion[] = [
    { id: "market-order", label: "Market trade", prompt: "What is a market trade?" },
    { id: "limit-order", label: "Limit trade", prompt: "What is a limit trade?" },
    { id: "stop-order", label: "Stop trade", prompt: "What is a stop trade?" },
    { id: "bid-ask", label: "Bid and ask", prompt: "What do bid and ask prices mean?" },
    { id: "market-hours", label: "Market hours", prompt: "What are regular market hours?" },
    { id: "diversification", label: "Diversification", prompt: "What does diversification mean?" },
  ];

  messages = signal<ChatMessage[]>([
    { sender: "bot", text: "Hi! Choose a topic below to learn general trading concepts. I cannot provide investment recommendations, price predictions, or portfolio advice.", time: this.now() },
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

  askQuestion(question: AssistantQuestion): void {
    this.submitQuestion(question.prompt, question.id);
  }

  sendMessage(): void {
    const text = this.draft().trim();
    if (!text) return;

    this.submitQuestion(text);
  }

  private submitQuestion(displayText: string, questionId?: string): void {
    if (this.isTyping()) return;

    this.messages.update((msgs) => [...msgs, { sender: "user", text: displayText, time: this.now() }]);
    this.draft.set("");
    this.scrollToBottom();

    this.isTyping.set(true);

    const response$ = this.assistantService.ask(displayText, questionId);

    response$.subscribe({
      next: (reply) => this.addBotMessage(reply),
      error: (err) => {
        console.error("AI assistant request failed", err.status, err.error);
        this.addBotMessage("I couldn't reach the assistant right now. Please try again shortly.");
      },
    });
  }


  private addBotMessage(text: string): void {
    this.isTyping.set(false);
    this.messages.update((msgs) => [...msgs, { sender: "bot", text, time: this.now() }]);
    this.scrollToBottom();
  }

  private now(): string {
    return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
}
