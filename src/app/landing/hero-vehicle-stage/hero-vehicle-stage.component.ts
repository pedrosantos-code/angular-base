import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { HeroScene } from './hero-vehicle-scene';

export type StagePhase = 'loading' | 'scanning' | 'identified' | 'fallback';

// Se o modelo demorar (rede lenta), o texto do Hero não pode ficar escondido para sempre.
const REVEAL_TIMEOUT_MS = 7000;

/**
 * Palco 3D do Hero: mostra a F-150 Raptor R e emite `revealed` quando o veículo
 * é "identificado" (ou imediatamente quando cai no fallback com imagem).
 */
@Component({
  selector: 'app-hero-vehicle-stage',
  standalone: true,
  templateUrl: './hero-vehicle-stage.component.html',
  styleUrl: './hero-vehicle-stage.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroVehicleStageComponent {
  /** Imagem usada quando não há WebGL, o modelo falha ou até o 3D ficar pronto. */
  fallbackSrc = input('f150.jpg');
  modelSrc = input('models/f150-raptor-r.glb');
  revealed = output<void>();

  phase = signal<StagePhase>('loading');
  progress = signal(0);

  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private zone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  private scene: HeroScene | null = null;
  private destroyed = false;
  private didReveal = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.scene?.dispose();
      this.scene = null;
    });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (!this.hasWebGL()) {
        this.useFallback();
        return;
      }
      this.start();
    });
  }

  private hasWebGL(): boolean {
    return typeof WebGL2RenderingContext !== 'undefined' || typeof WebGLRenderingContext !== 'undefined';
  }

  private useFallback(): void {
    this.phase.set('fallback');
    this.reveal();
  }

  private reveal(): void {
    if (this.didReveal) return;
    this.didReveal = true;
    this.revealed.emit();
  }

  private async start(): Promise<void> {
    const timer = setTimeout(() => this.reveal(), REVEAL_TIMEOUT_MS);
    this.destroyRef.onDestroy(() => clearTimeout(timer));

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    try {
      const { createHeroScene } = await import('./hero-vehicle-scene');
      if (this.destroyed) return;

      // O loop de animação roda fora da zona para não disparar detecção de mudanças a cada frame.
      const scene = await this.zone.runOutsideAngular(() =>
        createHeroScene({
          canvas: this.canvas().nativeElement,
          modelUrl: this.modelSrc(),
          reducedMotion,
          onProgress: (f) => this.zone.run(() => this.progress.set(f)),
          onLoaded: () => this.zone.run(() => this.phase.set('scanning')),
          onIdentified: () =>
            this.zone.run(() => {
              this.phase.set('identified');
              this.reveal();
            }),
          onError: () => this.zone.run(() => this.useFallback())
        })
      );
      if (this.destroyed) {
        scene.dispose();
        return;
      }
      this.scene = scene;
      this.observe(scene);
    } catch {
      if (!this.destroyed) this.useFallback();
    }
  }

  /** Pausa o render quando o palco sai da tela ou a aba fica oculta; reajusta ao redimensionar. */
  private observe(scene: HeroScene): void {
    const el = this.host.nativeElement;
    let visible = true;
    const apply = () => scene.setActive(visible && document.visibilityState === 'visible');

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      apply();
    });
    const ro = new ResizeObserver(() => scene.resize());
    io.observe(el);
    ro.observe(el);
    document.addEventListener('visibilitychange', apply);

    this.destroyRef.onDestroy(() => {
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', apply);
    });
  }
}
