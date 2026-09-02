import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { portfolioRanges } from "../../data/mock-data";

type RangeKey = "1D" | "5D" | "1Y" | "3Y" | "5Y";

interface ChartPoint {
  date: string;
  value: number;
  x: number;
  y: number;
}

@Component({
  selector: "app-portfolio-chart",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-[#11161b] border border-[#1e252b] flex flex-col rounded-[8px] w-full">
      <div class="border-b border-[#1e252b] flex items-center justify-between px-4 py-3">
        <div class="flex gap-3 items-center">
          <p class="font-['Geist_Mono:Bold'] font-bold text-[18px] text-white">PORTFOLIO</p>
          <p class="font-['Instrument_Sans:Regular'] font-normal text-[#94a3b8] text-[13px]" style="font-variation-settings: 'wdth' 100">
            Overall value over time
          </p>
          <div class="bg-[#1e252b] px-1.5 py-0.5 rounded-[4px]">
            <p class="font-['Instrument_Sans:Regular'] font-normal text-[#64748b] text-[10px]" style="font-variation-settings: 'wdth' 100">
              {{ range }}
            </p>
          </div>
        </div>
        <div class="flex gap-4 items-center">
          <div class="flex gap-1 items-center">
            @for (r of ranges; track r) {
              <button
                (click)="setRange(r)"
                class="px-2 py-1 rounded-[4px] text-[11px] font-['Instrument_Sans:SemiBold'] font-semibold transition-colors cursor-pointer"
                [ngClass]="range === r ? 'bg-[#1e252b] text-white' : 'text-[#64748b] hover:text-[#94a3b8]'"
                style="font-variation-settings: 'wdth' 100"
              >
                {{ r }}
              </button>
            }
          </div>
          <div class="flex gap-4 items-center">
            <div class="flex flex-col gap-0.5 items-end">
              <p class="font-['Geist_Mono:Bold'] font-bold text-[18px] text-white">{{ '$' + (currentValue | number: '1.2-2') }}</p>
              <p class="font-['Geist_Mono:SemiBold'] font-semibold text-[11px]" [ngClass]="isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'">
                {{ isPositive ? "+" : "" }}{{ dayChangePct.toFixed(2) }}%
              </p>
            </div>
            <div class="flex flex-col gap-0.5 items-end">
              <p class="font-['Geist_Mono:SemiBold'] font-semibold text-[#94a3b8] text-[13px]">
                {{ isPositive ? "+" : "" }}{{ '$' + (dayChangeAbs | number: '1.2-2') }}
              </p>
              <p class="font-['Instrument_Sans:Regular'] font-normal text-[#64748b] text-[10px]" style="font-variation-settings: 'wdth' 100">
                {{ range === "1D" ? "TODAY" : "OVER " + range }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 h-[220px] relative" (mouseleave)="hoverIndex = null">
        <svg
          [attr.viewBox]="'0 0 ' + chartWidth + ' ' + chartHeight"
          class="w-full h-full"
          (mousemove)="onMouseMove($event)"
        >
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" [attr.stop-color]="isPositive ? '#10b981' : '#ef4444'" stop-opacity="0.15" />
              <stop offset="95%" [attr.stop-color]="isPositive ? '#10b981' : '#ef4444'" stop-opacity="0" />
            </linearGradient>
          </defs>

          @for (gy of gridYs; track gy) {
            <text [attr.x]="0" [attr.y]="gy.y + 3" fill="#64748b" font-size="10" font-family="Geist Mono:Regular">{{ gy.label }}</text>
          }

          <path [attr.d]="areaPath" fill="url(#portfolioGradient)" stroke="none" />
          <path [attr.d]="linePath" fill="none" [attr.stroke]="isPositive ? '#10b981' : '#ef4444'" stroke-width="1.5" />

          @for (t of tickPoints; track t.date) {
            <text [attr.x]="t.x" [attr.y]="chartHeight - 4" fill="#64748b" font-size="10" font-family="Geist Mono:Regular" text-anchor="middle">
              {{ t.date }}
            </text>
          }

          @if (hoverIndex !== null && points[hoverIndex]) {
            <line
              [attr.x1]="points[hoverIndex].x"
              [attr.x2]="points[hoverIndex].x"
              [attr.y1]="0"
              [attr.y2]="chartHeight - 16"
              stroke="#2d3748"
              stroke-width="1"
            />
            <circle
              [attr.cx]="points[hoverIndex].x"
              [attr.cy]="points[hoverIndex].y"
              r="3"
              [attr.fill]="isPositive ? '#10b981' : '#ef4444'"
            />
          }
        </svg>

        @if (hoverIndex !== null && points[hoverIndex]) {
          <div
            class="absolute bg-[#1e252b] border border-[#2d3748] rounded-[4px] px-3 py-2 pointer-events-none"
            [style.left.px]="tooltipLeft"
            [style.top.px]="8"
          >
            <p class="font-['Geist_Mono:SemiBold'] font-semibold text-[13px] text-white">
              {{ '$' + (points[hoverIndex].value | number: '1.2-2') }}
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class PortfolioChartComponent {
  ranges: RangeKey[] = ["1D", "5D", "1Y", "3Y", "5Y"];
  range: RangeKey = "5D";

  chartWidth = 800;
  chartHeight = 220;
  padding = { top: 4, right: 4, bottom: 20, left: 36 };

  points: ChartPoint[] = [];
  tickPoints: { date: string; x: number }[] = [];
  gridYs: { y: number; label: string }[] = [];
  areaPath = "";
  linePath = "";

  startValue = 0;
  currentValue = 0;
  dayChangeAbs = 0;
  dayChangePct = 0;
  isPositive = true;

  hoverIndex: number | null = null;
  tooltipLeft = 0;

  constructor() {
    this.computeChart();
  }

  setRange(r: RangeKey) {
    this.range = r;
    this.hoverIndex = null;
    this.computeChart();
  }

  private computeChart() {
    const raw = portfolioRanges[this.range].data;
    const step = Math.max(1, Math.floor(raw.length / 80));
    const sampled = raw.filter((_, i) => i % step === 0 || i === raw.length - 1);

    this.startValue = sampled[0]?.value ?? 0;
    this.currentValue = sampled[sampled.length - 1]?.value ?? 0;
    this.dayChangeAbs = Math.abs(this.currentValue - this.startValue);
    const dayChange = this.currentValue - this.startValue;
    this.dayChangePct = this.startValue > 0 ? (dayChange / this.startValue) * 100 : 0;
    this.isPositive = dayChange >= 0;

    const minVal = Math.min(...sampled.map((d) => d.value));
    const maxVal = Math.max(...sampled.map((d) => d.value));
    const innerW = this.chartWidth - this.padding.left - this.padding.right;
    const innerH = this.chartHeight - this.padding.top - this.padding.bottom;

    this.points = sampled.map((d, i) => {
      const x = this.padding.left + (i / (sampled.length - 1 || 1)) * innerW;
      const ratio = maxVal === minVal ? 0.5 : (d.value - minVal) / (maxVal - minVal);
      const y = this.padding.top + (1 - ratio) * innerH;
      return { date: d.date, value: d.value, x, y };
    });

    this.linePath = this.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    const bottomY = this.chartHeight - this.padding.bottom;
    this.areaPath = this.points.length
      ? `${this.linePath} L${this.points[this.points.length - 1].x.toFixed(2)},${bottomY} L${this.points[0].x.toFixed(2)},${bottomY} Z`
      : "";

    const tickCount = 5;
    const tickStep = Math.max(1, Math.floor(this.points.length / tickCount));
    this.tickPoints = this.points.filter((_, i) => i % tickStep === 0).map((p) => ({ date: p.date, x: p.x }));

    this.gridYs = [0.25, 0.75].map((r) => ({
      y: this.padding.top + r * innerH,
      label: `${((minVal + (1 - r) * (maxVal - minVal)) / 1000).toFixed(0)}k`,
    }));
  }

  onMouseMove(event: MouseEvent) {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const scaleX = this.chartWidth / rect.width;
    const mouseX = (event.clientX - rect.left) * scaleX;

    let closestIdx = 0;
    let closestDist = Infinity;
    this.points.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });
    this.hoverIndex = closestIdx;

    const rectWidth = rect.width;
    const point = this.points[closestIdx];
    const ratio = point.x / this.chartWidth;
    this.tooltipLeft = Math.min(Math.max(ratio * rectWidth - 30, 0), rectWidth - 80);
  }
}
