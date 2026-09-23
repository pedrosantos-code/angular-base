import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth.service';
import { FONTE_VEICULOS, fonteVazia } from '../shared/fonte-veiculos';
import { FONTE_AFINIDADE, fonteAfinidadeVazia } from '../shared/fonte-afinidade';
import { PortalComponent } from './portal.component';

describe('PortalComponent', () => {
  function criar() {
    TestBed.configureTestingModule({
      imports: [PortalComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout: async () => {} } },
        // O portal renderiza o Agente de Perfil, que depende da fonte de afinidade
        // e da de veículos. As fontes vazias mantêm o teste sem rede.
        { provide: FONTE_AFINIDADE, useValue: fonteAfinidadeVazia('stub de teste') },
        { provide: FONTE_VEICULOS, useValue: fonteVazia('stub de teste') },
      ],
    });
    const fixture = TestBed.createComponent(PortalComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('mostra o Agente de Perfil', () => {
    const { el } = criar();
    expect(el.querySelectorAll('seia-agente').length).toBe(1);
  });

  it('não mostra mais a busca "Qual é o seu próximo Ford?" nem os resultados de exemplo', () => {
    const { el } = criar();
    expect(el.querySelector('.l-hero-section')).toBeNull();
    expect(el.querySelector('.l-search-box')).toBeNull();
    expect(el.querySelector('.l-result-card')).toBeNull();
  });
});
