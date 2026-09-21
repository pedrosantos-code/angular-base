import { Component } from '@angular/core';

interface LinhaDeLuz {
  d: string;
  duracao: number;
  atraso: number;
  espessura: number;
}

/**
 * Linhas de luz no fundo da página: um SVG do tamanho da tela, animado só com CSS.
 * Cada linha tem uma curva e um traço curto (90 de 1000) que corre por ela, como um pulso de luz.
 *
 * Como usar: coloque <seia-linhas-de-luz /> na página e dê `isolation: isolate` ao :host dela, para o fundo (z-index -1)
 * ficar acima do fundo da página e abaixo do conteúdo. Blocos do conteúdo com fundo próprio cobrem as linhas.
 */
@Component({
  selector: 'seia-linhas-de-luz',
  standalone: true,
  template: `
    <svg class="ll-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <!-- some no começo, azul no meio, ciano na ponta -->
        <linearGradient id="ll-gradiente" x1="0" x2="1">
          <stop offset="0" stop-color="#1F5BE0" stop-opacity="0" />
          <stop offset=".55" stop-color="#1F5BE0" />
          <stop offset="1" stop-color="#06B6D4" />
        </linearGradient>
      </defs>
      @for (l of linhas; track $index) {
        <!-- trilho fixo, quase invisível -->
        <path [attr.d]="l.d" fill="none" stroke="rgba(31,91,224,.07)" stroke-width="1" />
        <!-- a luz que corre por cima -->
        <path
          class="ll-luz"
          [attr.d]="l.d"
          fill="none"
          stroke="url(#ll-gradiente)"
          [attr.stroke-width]="l.espessura"
          stroke-linecap="round"
          pathLength="1000"
          [style.animation-duration]="l.duracao + 's'"
          [style.animation-delay]="l.atraso + 's'" />
      }
    </svg>
  `,
  styles: `
    :host { display: contents; }
    .ll-svg { position: fixed; inset: 0; z-index: -1; width: 100%; height: 100%; pointer-events: none; }
    .ll-luz {
      stroke-dasharray: 90 910;
      animation: ll-fluxo linear infinite;
      filter: drop-shadow(0 0 3px rgba(31, 91, 224, .45));
    }
    @keyframes ll-fluxo {
      from { stroke-dashoffset: 1000; }
      to { stroke-dashoffset: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ll-luz { animation: none; stroke-dashoffset: 550; }
    }
  `,
})
export class LinhasDeLuzComponent {
  /**
   * As 7 linhas. Curva, velocidade (7 s a 14,5 s), atraso negativo (já começa no meio do caminho, então nunca estão todas
   * sincronizadas) e espessura (1,1 ou 1,6) mudam de uma para outra: por isso o movimento parece orgânico. As curvas
   * começam e terminam fora da tela (-100 e 1700), então a luz entra e sai sem aparecer cortada.
   */
  readonly linhas: LinhaDeLuz[] = [
    { d: 'M -100 200 C 400 120, 1100 300, 1700 180', duracao: 8, atraso: -2, espessura: 1.6 },
    { d: 'M -100 620 C 300 720, 900 520, 1700 660', duracao: 11, atraso: -3.4, espessura: 1.1 },
    { d: 'M -100 420 C 500 330, 1000 560, 1700 400', duracao: 7.5, atraso: -5, espessura: 1.6 },
    { d: 'M -100 90 C 350 200, 1200 20, 1700 120', duracao: 14.5, atraso: -1, espessura: 1.1 },
    { d: 'M -100 780 C 450 700, 1150 860, 1700 760', duracao: 9.5, atraso: -6.5, espessura: 1.6 },
    { d: 'M -100 320 C 250 460, 1250 240, 1700 500', duracao: 12, atraso: -4, espessura: 1.1 },
    { d: 'M -100 520 C 600 620, 950 400, 1700 560', duracao: 13, atraso: -8, espessura: 1.6 },
  ];
}
