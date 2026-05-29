import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';

describe('Dashboard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
    }).compileComponents();
  });

  it('should create the dashboard', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const dashboard = fixture.componentInstance;
    expect(dashboard).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, meu-projeto');
  });
});