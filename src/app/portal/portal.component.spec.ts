import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth.service';
import { FONTE_VEICULOS, fonteVazia } from '../shared/fonte-veiculos';
import { PortalComponent } from './portal.component';

describe('PortalComponent · fotos', () => {
  function criar() {
    TestBed.configureTestingModule({
      imports: [PortalComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout: async () => {} } },
        // O portal renderiza o Agente de Perfil, que depende de uma fonte de veículos.
        // A fonte vazia mantém o teste sem rede — aqui só se verificam as fotos.
        { provide: FONTE_VEICULOS, useValue: fonteVazia('stub de teste') },
      ],
    });
    const fixture = TestBed.createComponent(PortalComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('mostra a foto de cada modelo do resultado de exemplo', () => {
    const { el } = criar();
    const fotos = Array.from(el.querySelectorAll<HTMLImageElement>('.l-result-foto'));
    expect(fotos.length).toBe(3);
    expect(fotos.map((f) => f.alt)).toEqual(['Ford Territory', 'Ford Ranger', 'Ford Bronco Sport']);
    expect(fotos[0].getAttribute('src')).toBe('territory.jpeg');
  });

  it('mostra a foto nos destaques da linha', () => {
    const { el } = criar();
    expect(el.querySelectorAll('.l-model-foto').length).toBe(4);
  });

  it('usa o layout com foto só nos cards que têm foto', () => {
    const { el } = criar();
    expect(el.querySelectorAll('.l-result-card--foto').length).toBe(3);
  });
});
