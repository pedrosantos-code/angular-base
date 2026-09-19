import { Component, EventEmitter, HostListener, Output, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export interface ItemMenu {
  chave: string;
  rotulo: string;
  icone: string;
}

/** Ícones em SVG inline — sem depender de fonte externa. */
export const ICONES: Record<string, string[]> = {
  menu: ['M4 7h16M4 12h16M4 17h16'],
  perfil: [
    'M12 12.6a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4z',
    'M5.3 19.8a6.9 6.9 0 0 1 13.4 0',
  ],
  config: [
    'M6 4v6.2M6 14.2V20M12 4v9.2M12 17.2V20M18 4v2.2M18 10.2V20',
    'M6 12.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 15.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 8.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  ],
  sair: [
    'M10 20H6.5A2.5 2.5 0 0 1 4 17.5v-11A2.5 2.5 0 0 1 6.5 4H10',
    'M15.5 16 20 12l-4.5-4M20 12H9.5',
  ],
  ia: ['M12 3.2l2 4.8 4.8 2-4.8 2-2 4.8-2-4.8-4.8-2 4.8-2z'],
  carro: ['M5 17h14M4.5 17v-4.2L6.4 8h11.2l1.9 4.8V17M5 17v2M19 17v2', 'M8 13h.01M16 13h.01'],
  grafico: ['M4 20V10.5M10 20V4.5M16 20v-6.5M3 20h18'],
  agenda: ['M4 5.5h16v15H4zM4 10h16M8.5 3v4.5M15.5 3v4.5'],
  local: ['M12 21.5s6.8-6 6.8-11.5a6.8 6.8 0 1 0-13.6 0C5.2 15.5 12 21.5 12 21.5z', 'M12 7.2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],
  telefone: ['M20.8 16.9v2.4a2 2 0 0 1-2.2 2 19.4 19.4 0 0 1-8.4-3 19 19 0 0 1-5.8-5.8 19.4 19.4 0 0 1-3-8.5A2 2 0 0 1 3.4 2h2.5a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.7a2 2 0 0 1-.5 2.1L7 9.7a15.8 15.8 0 0 0 5.9 5.9l1.2-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z'],
  cerebro: ['M9.5 21h5M10.2 18.2h3.6', 'M12 3a6 6 0 0 1 3.8 10.6v1.9H8.2v-1.9A6 6 0 0 1 12 3z'],
  documento: ['M7 3.5h6.8L19 8.6V20.5H7z', 'M13.8 3.5v5.1H19M10 13.5h6M10 17h6'],
};

/** "Encontrar meu Ford" não entra aqui — o logo da gaveta já leva pra lá (irHome), não precisa duplicar. */
export const ITENS_PRINCIPAIS: ItemMenu[] = [
  { chave: 'modelos', rotulo: 'Modelos Ford', icone: 'carro' },
  { chave: 'comparacoes', rotulo: 'Dashboard detalhado', icone: 'grafico' },
];

export const ITENS_ATENDIMENTO: ItemMenu[] = [
  { chave: 'agendamentos', rotulo: 'Meus agendamentos', icone: 'agenda' },
  { chave: 'concessionarias', rotulo: 'Concessionárias', icone: 'local' },
  { chave: 'contato', rotulo: 'Fale conosco', icone: 'telefone' },
];

export const ITENS_SOBRE: ItemMenu[] = [
  { chave: 'ia', rotulo: 'Como a IA decide', icone: 'cerebro' },
  { chave: 'termos', rotulo: 'Termos e contratos', icone: 'documento' },
];

/** Mapa chave da gaveta → rota real, para páginas que navegam de fato pelo Router. */
export const ROTAS_MENU: Record<string, string> = {
  recomendacao: '/portal',
  modelos: '/modelos',
  comparacoes: '/dashboard',
  agendamentos: '/agendamentos',
  concessionarias: '/concessionarias',
  contato: '/fale-conosco',
  ia: '/sobre-ia',
  termos: '/termos',
};

/** Mapa inverso: rota real → chave da gaveta, usado para realçar o item ativo a partir da URL. */
const CHAVE_POR_ROTA: Record<string, string> = Object.fromEntries(
  Object.entries(ROTAS_MENU).map(([chave, rota]) => [rota, chave]),
);

@Component({
  selector: 'seia-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class TopbarComponent {
  private router = inject(Router);

  /** URL atual, atualizada a cada navegação — fonte única para saber qual item está ativo. */
  private urlAtual = signal(this.router.url);

  /** Chave do item ativo na gaveta, derivada dinamicamente da rota atual. */
  readonly ativo = computed(() => {
    const url = this.urlAtual().split('?')[0].split('#')[0];
    return CHAVE_POR_ROTA[url] ?? '';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((evento) => this.urlAtual.set(evento.urlAfterRedirects));
  }

  @Output() navegar = new EventEmitter<string>();
  @Output() sair = new EventEmitter<void>();

  readonly icones = ICONES;
  readonly principais = ITENS_PRINCIPAIS;
  readonly atendimento = ITENS_ATENDIMENTO;
  readonly sobre = ITENS_SOBRE;

  aberto = false;

  alternar(): void {
    this.aberto = !this.aberto;
  }

  fechar(): void {
    this.aberto = false;
  }

  ir(chave: string): void {
    this.navegar.emit(chave);
    this.fechar();
  }

  irHome(): void {
    this.fechar();
    this.router.navigateByUrl(ROTAS_MENU['recomendacao']);
  }

  irPerfil(): void {
    this.fechar();
    this.router.navigateByUrl('/perfil');
  }

  @HostListener('document:keydown.escape')
  aoPressionarEsc(): void {
    this.fechar();
  }
}
