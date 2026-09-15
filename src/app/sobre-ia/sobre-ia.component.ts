import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';

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

  @Output() navegar = new EventEmitter<string>();

  readonly entradas: Entrada[] = [
    { ordem: 'Entrada 01', titulo: 'O que você escreve', texto: 'Rotina, número de passageiros, uso na estrada e teto de orçamento.' },
    { ordem: 'Entrada 02', titulo: 'Seu histórico', texto: 'Modelos que você comparou antes e os que descartou.' },
    { ordem: 'Entrada 03', titulo: 'Ficha técnica oficial', texto: 'Especificação publicada pela Ford para cada versão em linha.' },
  ];

  @Input() exemplo: ExemploNota = {
    modelo: 'Territory Titanium',
    perfil: 'família · estrada · até R$ 250 mil',
    pesos: '5 critérios, peso igual',
    criterios: [
      { rotulo: 'Espaço para os passageiros', pontos: 20, maximo: 20 },
      { rotulo: 'Porta-malas para viagem', pontos: 20, maximo: 20 },
      { rotulo: 'Conforto de rodagem', pontos: 19, maximo: 20 },
      { rotulo: 'Consumo na estrada', pontos: 18, maximo: 20 },
      { rotulo: 'Preço dentro do teto', pontos: 17, maximo: 20 },
    ],
  };

  readonly usamos = [
    'O texto que você escreve na busca',
    'Suas comparações anteriores no portal',
    'Ficha técnica e preço público de cada versão',
  ];

  readonly naoUsamos = [
    'Dados de crédito ou renda declarada',
    'Estoque ou meta de venda da concessionária',
    'Qualquer dado seu para publicidade de terceiros',
  ];

  readonly limites: Limite[] = [
    { titulo: 'Não negocia preço', texto: 'A nota usa o preço público. Desconto é conversa com a concessionária.' },
    { titulo: 'Não garante disponibilidade', texto: 'Um modelo com nota alta pode não estar disponível na sua região.' },
    { titulo: 'Não substitui o test-drive', texto: 'Conforto e dirigibilidade só se confirmam no banco do carro.' },
    { titulo: 'Não decide por você', texto: 'A nota ordena opções. A escolha continua sua.' },
  ];

  readonly corteFraco = 0.9;

  get total(): number {
    return this.exemplo.criterios.reduce((s, c) => s + c.pontos, 0);
  }

  get maximo(): number {
    return this.exemplo.criterios.reduce((s, c) => s + c.maximo, 0);
  }

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
    this.router.navigateByUrl('/');
  }
}