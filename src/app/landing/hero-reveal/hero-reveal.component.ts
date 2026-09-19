import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  inject,
  viewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { revealPhases } from './hero-reveal.phases';

/**
 * Hero "cinematic scroll reveal": só imagens em camadas, máscaras e CSS, controlados pelo
 * scroll (sem 3D). O componente é uma seção alta com um palco "sticky"; o progresso do
 * scroll dentro dela vira variáveis CSS (--rev, --drl, --head…) e o CSS faz o resto.
 * O conteúdo do Hero entra por projeção; marque a ordem com data-reveal-step="1..4".
 */
@Component({
  selector: 'app-hero-reveal',
  standalone: true,
  templateUrl: './hero-reveal.component.html',
  styleUrl: './hero-reveal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroRevealComponent implements AfterViewInit {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private zone = inject(NgZone);
  private destroyRef = inject(DestroyRef);
  private stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  private frame = 0;
  private lastProgress = -1;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const el = this.host.nativeElement;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduceMotion) {
      // Sem animação: estado final estático, sem scroll "preso".
      el.classList.add('is-static');
      this.apply(1);
      return;
    }

    const schedule = () => {
      if (this.frame) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.update();
      });
    };
    // Só variáveis CSS mudam: não precisa disparar detecção de mudanças a cada scroll.
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
    });
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (this.frame) cancelAnimationFrame(this.frame);
    });
    this.apply(0);
    this.update();
  }

  /** Progresso 0..1 do scroll dentro da seção (o palco fica fixo enquanto ela passa). */
  private update(): void {
    const el = this.host.nativeElement;
    const stage = this.stage().nativeElement;
    const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
    const scrollable = el.offsetHeight - stage.offsetHeight;
    if (scrollable <= 0) return;
    const p = Math.min(1, Math.max(0, (stickyTop - el.getBoundingClientRect().top) / scrollable));
    if (Math.abs(p - this.lastProgress) < 0.0005) return;
    this.apply(p);
  }

  private apply(p: number): void {
    this.lastProgress = p;
    const el = this.host.nativeElement;
    const s = revealPhases(p);
    const set = (name: string, v: number) => el.style.setProperty(name, v.toFixed(4));
    set('--hint', s.hint);
    set('--outline', s.outline);
    set('--sil', s.sil);
    set('--rev', s.rev);
    set('--bright', s.bright);
    set('--tag', s.tag);
    set('--drl', s.drl);
    set('--bloom', s.bloom);
    set('--head', s.head);
    set('--scan', s.scan);
    set('--scan-o', s.scanO);
    set('--recede', s.recede);
    s.t.forEach((v, i) => set(`--t${i + 1}`, v));
    // Só deixa clicar nos botões quando o texto já apareceu.
    el.classList.toggle('has-text', s.t[3] > 0.6);
  }
}
