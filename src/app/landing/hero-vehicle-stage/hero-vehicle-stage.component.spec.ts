import { TestBed } from '@angular/core/testing';
import { HeroVehicleStageComponent } from './hero-vehicle-stage.component';

describe('HeroVehicleStageComponent', () => {
  function criar() {
    TestBed.configureTestingModule({ imports: [HeroVehicleStageComponent] });
    const fixture = TestBed.createComponent(HeroVehicleStageComponent);
    const revealed = vi.fn();
    fixture.componentInstance.revealed.subscribe(revealed);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, revealed };
  }

  it('sem WebGL (jsdom) cai no fallback e libera o conteúdo do Hero na hora', () => {
    const { fixture, revealed } = criar();
    expect(fixture.componentInstance.phase()).toBe('fallback');
    expect(revealed).toHaveBeenCalledTimes(1);
  });

  it('no fallback mostra a imagem configurada e esconde o HUD e o crédito', () => {
    const { fixture, el } = criar();
    fixture.componentRef.setInput('fallbackSrc', 'images/f150.jpg');
    fixture.detectChanges();

    const img = el.querySelector('.stage__fallback') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('images/f150.jpg');
    expect(el.querySelector('.stage__hud')).toBeNull();
    expect(el.querySelector('.stage__credit')).toBeNull();
  });
});
