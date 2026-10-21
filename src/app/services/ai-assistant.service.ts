import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, Observable, of } from "rxjs";

export interface AssistantQuestion {
  id: string;
  label: string;
  prompt: string;
}

interface AssistantResponse {
  answer: string;
}

@Injectable({ providedIn: "root" })
export class AiAssistantService {
  private readonly http = inject(HttpClient);

  ask(question: string, questionId?: string): Observable<string> {
    return this.http.post<AssistantResponse>("/api/ai-assistant/chat", { question, questionId })
      .pipe(map((response) => response.answer));
  }

  refusal(): Observable<string> {
    return of("I can explain general trading concepts, but I cannot recommend stocks, trades, price targets, or actions for your portfolio. Try one of the topics above.");
  }
}