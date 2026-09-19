import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RevealDirective } from './reveal.directive';

@Component({
  standalone: true,
  imports: [RevealDirective],
  template: `<div appReveal="left" [revealDelay]="0" id="alvo">conteúdo</div>`,
})
class HostComponent {}

describe('RevealDirective', () => {
  function criar() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('#alvo') as HTMLElement;
    const diretiva = fixture.debugElement.children[0].injector.get(RevealDirective);
    return { fixture, el, diretiva };
  }

  function posicionar(el: HTMLElement, top: number) {
    el.getBoundingClientRect = () => ({ top }) as DOMRect;
  }

  it('aplica as classes de animação da variante', () => {
    const { el } = criar();
    expect(el.classList.contains('reveal')).toBe(true);
    expect(el.classList.contains('reveal-left')).toBe(true);
  });

  it('fica invisível (--p = 0) quando está abaixo da tela', () => {
    const { el, diretiva } = criar();
    posicionar(el, 5000);
    diretiva.update(800, false);
    expect(el.style.getPropertyValue('--p')).toBe('0.000');
  });

  it('fica completo (--p = 1) quando já passou da posição de entrada', () => {
    const { el, diretiva } = criar();
    posicionar(el, 0);
    diretiva.update(800, false);
    expect(el.style.getPropertyValue('--p')).toBe('1.000');
  });

  it('acompanha o scroll nos dois sentidos', () => {
    const { el, diretiva } = criar();
    posicionar(el, 700); // meio da transição
    diretiva.update(800, false);
    const meio = Number(el.style.getPropertyValue('--p'));
    expect(meio).toBeGreaterThan(0);
    expect(meio).toBeLessThan(1);

    posicionar(el, 5000); // rolou de volta para cima: recua
    diretiva.update(800, false);
    expect(Number(el.style.getPropertyValue('--p'))).toBe(0);
  });

  it('no fim da página mostra tudo o que está na tela', () => {
    const { el, diretiva } = criar();
    posicionar(el, 790);
    diretiva.update(800, true);
    expect(el.style.getPropertyValue('--p')).toBe('1.000');
  });
});
