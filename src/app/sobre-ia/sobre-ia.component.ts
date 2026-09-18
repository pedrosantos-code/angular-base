import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { AuthService } from '../auth.service';

export interface Entrada { ordem: string; titulo: string; texto: string; }
export interface Criterio { rotulo: string; pontos: number; maximo: number; }
export interface Limite { titulo: string; texto: string; }

export interface ExemploNota {
  modelo: string;
  perfil: string;
  criterios: Criterio[];
  pesos: string;
}

@Component({
  selector: 'seia-sobre-ia',
  standalone: true,
  imports: [CommonModule, TopbarComponent, RodapeComponent],
  templateUrl: './sobre-ia.component.html',
  styleUrl: './sobre-ia.component.css',
})
export class SobreIaComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  @Output() navegar = new EventEmitter<string>();

  readonly entradas: Entrada[] = [
    { ordem: 'Entrada 01', titulo: 'O que você escreve', texto: 'Rotina, passageiros, tipo de estrada e teto de orçamento, em texto livre.' },
    { ordem: 'Entrada 02', titulo: 'Palavras de uso', texto: 'O sistema procura termos como família, estrada, cidade, off-road, trabalho, economia ou elétrico, e valores como "250 mil".' },
    { ordem: 'Entrada 03', titulo: 'Perfil de cada modelo', texto: 'Cada modelo Ford do catálogo tem etiquetas de uso. Exemplo: Territory = família, viagem, estrada, cidade.' },
  ];

  @Input() exemplo: ExemploNota = {
    modelo: 'Territory',
    perfil: 'família · estrada · até R$ 250 mil',
    pesos: 'Preço a partir de R$ 219.900: dentro do teto, sem desconto na nota',
    criterios: [
      { rotulo: 'Ponto de partida (perfil detectado)', pontos: 45, maximo: 45 },
      { rotulo: 'Modelo tem a etiqueta "família"', pontos: 14, maximo: 14 },
      { rotulo: 'Modelo tem a etiqueta "estrada"', pontos: 14, maximo: 14 },
    ],
  };

  readonly usamos = [
    'O texto que você escreve na busca (palavras de uso e orçamento)',
    'As etiquetas de uso de cada modelo',
    'O preço "a partir de" de cada modelo',
  ];

  readonly naoUsamos = [
    'Dados de crédito ou renda',
    'Estoque ou meta de venda da concessionária',
    'Seus favoritos e comparações anteriores',
  ];

  readonly limites: Limite[] = [
    { titulo: 'Reconhece palavras, não frases', texto: 'A nota vem das palavras-chave do seu texto. Se você não citar o uso, a nota fica genérica.' },
    { titulo: 'Não negocia preço', texto: 'A nota usa o preço "a partir de". Desconto é conversa com a concessionária.' },
    { titulo: 'Não garante disponibilidade', texto: 'Um modelo com nota alta pode não estar disponível na sua região.' },
    { titulo: 'Não substitui o test-drive', texto: 'Conforto e dirigibilidade só se confirmam no banco do carro.' },
    { titulo: 'Não decide por você', texto: 'A nota ordena opções. A escolha continua sua.' },
  ];

  readonly corteFraco = 0.9;

  get total(): number {
    return this.exemplo.criterios.reduce((s, c) => s + c.pontos, 0);
  }

  /** A nota vai de 0 a 100 (na prática, entre 15 e 97). */
  readonly maximo = 100;

  proporcao(c: Criterio): number {
    return c.maximo ? c.pontos / c.maximo : 0;
  }

  // Método para tratar o evento de navegação sem conflito de tipo de evento nativo
  onNavegar(chave: string): void {
    this.navegar.emit(chave);
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    void this.authService.logout();
  }
}