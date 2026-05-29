import { TestBed } from '@angular/core/testing';
import { CadastroComponent } from './cadastro.component';

describe('Cadastro', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroComponent],
    }).compileComponents();
  });

  it('should create the sign-in', () => {
    const fixture = TestBed.createComponent(CadastroComponent);
    const cadastro = fixture.componentInstance;
    expect(cadastro).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(CadastroComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, meu-projeto');
  });
});     