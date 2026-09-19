import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HeroRevealComponent } from './hero-reveal.component';
import { HOLD_START, revealPhases } from './hero-reveal.phases';

@Component({
  standalone: true,
  imports: [HeroRevealComponent],
  template: `<app-hero-reveal>
    <h1 data-reveal-step="2">Título</h1>
    <div data-reveal-step="4"><button type="button">Ação</button></div>
  </app-hero-reveal>`
})
class HostComponent {}

describe('revealPhases', () => {
  it('começa escuro: só um traço de contorno e a dica de scroll', () => {
    const s = revealPhases(0);
    expect(s.hint).toBe(1);
    expect(s.rev).toBe(0);
    expect(s.drl).toBe(0);
    expect(s.head).toBe(0);
    expect(s.t).toEqual([0, 0, 0, 0]);
    expect(s.outline).toBeGreaterThan(0);
    expect(s.outline).toBeLessThan(0.3);
  });

  it('segue a ordem do roteiro: silhueta, revelação, DRLs, faróis, scanner, texto', () => {
    const at = (p: number) => revealPhases(p * HOLD_START);
    expect(at(0.3).outline).toBeGreaterThan(0.9);
    expect(at(0.4).rev).toBeGreaterThan(0);
    expect(at(0.4).drl).toBe(0);
    expect(at(0.52).rev).toBeCloseTo(1, 1);
    expect(at(0.7).drl).toBeCloseTo(1, 1);
    expect(at(0.7).head).toBe(0);
    expect(at(0.9).head).toBeCloseTo(1, 1);
    expect(at(0.94).scanO).toBeGreaterThan(0.5);
    expect(at(0.95).t[0]).toBeGreaterThan(0);
    expect(at(0.95).t[3]).toBe(0);
  });

  it('no fim tudo está aceso e o texto inteiro visível; o estado final é segurado', () => {
    const end = revealPhases(HOLD_START);
    expect(end.rev).toBe(1);
    expect(end.drl).toBe(1);
    expect(end.head).toBe(1);
    expect(end.recede).toBe(1);
    expect(end.t).toEqual([1, 1, 1, 1]);
    expect(end.scanO).toBeCloseTo(0, 5);
    expect(revealPhases(1)).toEqual(end);
  });

  it('valores ficam sempre entre 0 e 1', () => {
    for (let p = -0.2; p <= 1.2; p += 0.05) {
      const s = revealPhases(p);
      for (const v of [s.hint, s.outline, s.sil, s.rev, s.drl, s.bloom, s.head, s.scan, s.scanO, s.recede, ...s.t]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('HeroRevealComponent', () => {
  it('projeta o conteúdo do Hero e mantém as camadas de imagem decorativas', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.content h1')?.textContent).toBe('Título');
    expect(el.querySelector('.content button')).toBeTruthy();
    const layers = el.querySelectorAll('img.layer');
    expect(layers.length).toBeGreaterThanOrEqual(5);
    layers.forEach(img => expect(img.getAttribute('alt')).toBe(''));
  });

  it('escreve as variáveis CSS de progresso no host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = (fixture.nativeElement as HTMLElement).querySelector('app-hero-reveal') as HTMLElement;
    expect(host.style.getPropertyValue('--hint')).not.toBe('');
  });

  it('com reduced-motion vai direto ao estado final, sem scroll preso', () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      const host = (fixture.nativeElement as HTMLElement).querySelector('app-hero-reveal') as HTMLElement;
      expect(host.classList.contains('is-static')).toBe(true);
      expect(host.classList.contains('has-text')).toBe(true);
      expect(host.style.getPropertyValue('--t4')).toBe('1.0000');
      expect(host.style.getPropertyValue('--drl')).toBe('1.0000');
    } finally {
      window.matchMedia = original;
    }
  });
});
