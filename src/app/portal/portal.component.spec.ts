import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth.service';
import { FONTE_VEICULOS, fonteVazia } from '../shared/fonte-veiculos';
import { PortalComponent } from './portal.component';

describe('PortalComponent', () => {
  function criar() {
    TestBed.configureTestingModule({
      imports: [PortalComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout: async () => {} } },
        // O Agente de Perfil depende de uma fonte de veículos; a fonte vazia mantém o teste sem rede.
        { provide: FONTE_VEICULOS, useValue: fonteVazia('stub de teste') },
      ],
    });
    const fixture = TestBed.createComponent(PortalComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('mostra só o Agente de Perfil no conteúdo da página', () => {
    const { el } = criar();
    const main = el.querySelector('main') as HTMLElement;
    expect(main.querySelectorAll('seia-agente').length).toBe(1);
    expect(main.children.length).toBe(1);
  });

  it('mantém o topbar e o rodapé padrão', () => {
    const { el } = criar();
    expect(el.querySelector('seia-topbar')).not.toBeNull();
    expect(el.querySelector('seia-rodape')).not.toBeNull();
  });

  it('não mostra mais a busca, os resultados de exemplo nem o rodapé em colunas', () => {
    const { el } = criar();
    expect(el.querySelector('.l-search-box')).toBeNull();
    expect(el.querySelector('.l-result-card')).toBeNull();
    expect(el.querySelector('.l-footer')).toBeNull();
  });
});
