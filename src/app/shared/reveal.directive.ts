import { Directive, ElementRef, OnDestroy, OnInit, Renderer2, inject, input } from '@angular/core';

/**
 * Anima o elemento conforme o scroll (scroll-scrubbed): ao descer ele avança,
 * ao subir ele volta, acompanhando a posição da rolagem.
 * Uso: <div appReveal="up" [revealDelay]="120">
 * Variantes: up (padrão), left, right, zoom.
 * O progresso (0 a 1) é exposto na variável CSS --p; os estilos .reveal* ficam
 * no CSS do componente que usa a diretiva.
 */

// Um único listener de scroll/resize compartilhado por todas as instâncias.
const instances = new Set<RevealDirective>();
let listening = false;
let frame = 0;

function schedule(): void {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const vh = window.innerHeight;
    const atBottom = window.scrollY + vh >= document.documentElement.scrollHeight - 2;
    instances.forEach(i => i.update(vh, atBottom));
  });
}

function listen(): void {
  if (listening) return;
  listening = true;
  window.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('resize', schedule, { passive: true });
}

function unlisten(): void {
  if (!listening || instances.size) return;
  listening = false;
  window.removeEventListener('scroll', schedule, { capture: true });
  window.removeEventListener('resize', schedule);
}

@Directive({
  selector: '[appReveal]',
  standalone: true
})
export class RevealDirective implements OnInit, OnDestroy {
  appReveal = input<'up' | 'left' | 'right' | 'zoom' | ''>('up');
  revealDelay = input<number>(0);

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderer = inject(Renderer2);
  private last = -1;

  ngOnInit(): void {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const host = this.el.nativeElement;
    this.renderer.addClass(host, 'reveal');
    this.renderer.addClass(host, `reveal-${this.appReveal() || 'up'}`);

    instances.add(this);
    listen();
    this.update(window.innerHeight, false);
    schedule();
  }

  /** Calcula o progresso a partir da posição do topo do elemento na viewport. */
  update(vh: number, atBottom: boolean): void {
    const top = this.el.nativeElement.getBoundingClientRect().top;
    // O atraso vira um deslocamento no ponto de início, criando o efeito escalonado.
    const start = vh * 0.98 - this.revealDelay() * 0.4;
    const range = vh * 0.3;

    let p = Math.min(1, Math.max(0, (start - top) / range));
    if (atBottom && top < vh) p = 1; // fim da página: garante que tudo apareça
    p = 1 - Math.pow(1 - p, 3); // ease-out

    if (Math.abs(p - this.last) < 0.002) return;
    this.last = p;
    this.el.nativeElement.style.setProperty('--p', p.toFixed(3));
  }

  ngOnDestroy(): void {
    instances.delete(this);
    unlisten();
  }
}
