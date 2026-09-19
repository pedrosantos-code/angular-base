import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  function criar() {
    TestBed.configureTestingModule({ imports: [LandingComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renderiza as cinco seções navegáveis', () => {
    const { el } = criar();
    for (const id of ['problema', 'proposta', 'funciona', 'diferencial', 'impacto']) {
      expect(el.querySelector(`#${id}`), id).toBeTruthy();
    }
  });

  it('o menu mobile abre, expõe os links e fecha', () => {
    const { fixture, el } = criar();
    const botao = el.querySelector('.menu-toggle') as HTMLButtonElement;
    expect(el.querySelector('#menu-mobile')).toBeNull();
    expect(botao.getAttribute('aria-expanded')).toBe('false');

    botao.click();
    fixture.detectChanges();
    expect(el.querySelector('#menu-mobile')).toBeTruthy();
    expect(el.querySelectorAll('#menu-mobile .menu-panel__link').length).toBe(5);
    expect(botao.getAttribute('aria-expanded')).toBe('true');

    fixture.componentInstance.closeMenu();
    fixture.detectChanges();
    expect(el.querySelector('#menu-mobile')).toBeNull();
  });

  it('clicar num link rola até a seção e fecha o menu', () => {
    const { fixture, el } = criar();
    const alvo = el.querySelector('#proposta') as HTMLElement;
    alvo.scrollIntoView = vi.fn();
    fixture.componentInstance.menuOpen.set(true);

    fixture.componentInstance.goTo(new Event('click'), 'proposta');

    expect(alvo.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(fixture.componentInstance.menuOpen()).toBe(false);
  });
});
