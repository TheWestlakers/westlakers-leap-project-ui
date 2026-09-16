import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ComplianceRecordsComponent } from "./compliance-records";

describe("ComplianceRecordsComponent", () => {
  let component: ComplianceRecordsComponent;
  let fixture: ComponentFixture<ComplianceRecordsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceRecordsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ComplianceRecordsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should initialize with mock compliance records", () => {
    expect(component.allRecords().length).toBeGreaterThan(0);
  });

  it("should calculate accepted count correctly", () => {
    const acceptedCount = component.getAcceptedCount();
    expect(acceptedCount).toBeGreaterThanOrEqual(0);
    expect(acceptedCount).toBeLessThanOrEqual(component.allRecords().length);
  });

  it("should calculate total cash impact", () => {
    const totalCashImpact = component.getTotalCashImpact();
    expect(typeof totalCashImpact).toBe("number");
  });

  it("should have correct BR-14 compliance requirement display", () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain("BR-14");
    expect(compiled.textContent).toContain("COMPLIANCE RECORDS");
    expect(compiled.textContent).toContain("AUDIT TRAIL");
  });

  it("should display immutable records indicator", () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain("IMMUTABLE RECORDS");
    expect(compiled.textContent).toContain("✓");
  });

  it("should show acceptance criteria message", () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain("immutable and permanently recorded");
  });
});
