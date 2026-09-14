import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../topbar/topbar.component';

export interface PerfilUso {
  uso: string;
  passageiros: string;
  rodagem: string;
  orcamento: string;
  /** No máximo dois. Recebem peso dobrado no cálculo da nota. */
  prioridades: string[];
}

export interface DadosConta {
  nome: string;
  telefone: string;
  /** Identificador da conta — não editável por aqui. */
  email: string;
  criadaEm: string;
}

export interface Previa {
  modelo: string;
  nota: number;
  outros: { modelo: string; nota: number }[];
}

@Component({
  selector: 'seia-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent {
  @Output() salvarPerfil = new EventEmitter<{ uso: PerfilUso; conta: DadosConta }>();
  @Output() navegar = new EventEmitter<string>();
  @Output() alternarConsentimento = new EventEmitter<boolean>();

  readonly opcoesUso = ['Cidade', 'Estrada', 'Off-road', 'Trabalho'];
  readonly opcoesPassageiros = ['1 ou 2', '3 ou 4', '5 ou mais'];
  readonly opcoesPrioridade = ['Consumo', 'Espaço', 'Conforto', 'Potência'];
  readonly maxPrioridades = 2;

  @Input() uso: PerfilUso = {
    uso: 'Cidade',
    passageiros: '3 ou 4',
    rodagem: '1.200 km',
    orcamento: 'R$ 250.000',
    prioridades: ['Consumo', 'Espaço'],
  };

  @Input() conta: DadosConta = {
    nome: 'Anthonio Silva',
    telefone: '(11) 98765-4321',
    email: 'anthonio@gmail.com',
    criadaEm: '02/04/2026',
  };

  /** Ranking calculado com o perfil já salvo. */
  @Input() previa: Previa = {
    modelo: 'Territory Titanium',
    nota: 94,
    outros: [
      { modelo: 'Bronco Sport', nota: 81 },
      { modelo: 'Ranger XLS', nota: 63 },
    ],
  };

  @Input() atalhos = [
    { chave: 'favoritos', rotulo: 'Meus favoritos', contagem: 3 },
    { chave: 'comparacoes', rotulo: 'Minhas comparações', contagem: 7 },
  ];

  @Input() compartilhaComConcessionaria = false;

  private usoOriginal: PerfilUso = structuredClone(this.uso);
  private contaOriginal: DadosConta = structuredClone(this.conta);

  get iniciais(): string {
    return this.conta.nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  /** Quantos campos divergem do que está salvo. Alimenta a barra de ação. */
  get alteracoes(): number {
    let n = 0;
    if (this.uso.uso !== this.usoOriginal.uso) n++;
    if (this.uso.passageiros !== this.usoOriginal.passageiros) n++;
    if (this.uso.rodagem !== this.usoOriginal.rodagem) n++;
    if (this.uso.orcamento !== this.usoOriginal.orcamento) n++;
    if (!this.mesmoConjunto(this.uso.prioridades, this.usoOriginal.prioridades)) n++;
    if (this.conta.nome !== this.contaOriginal.nome) n++;
    if (this.conta.telefone !== this.contaOriginal.telefone) n++;
    return n;
  }

  private mesmoConjunto(a: string[], b: string[]): boolean {
    return a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
  }

  escolherUso(v: string): void { this.uso.uso = v; }
  escolherPassageiros(v: string): void { this.uso.passageiros = v; }

  alternarPrioridade(v: string): void {
    const i = this.uso.prioridades.indexOf(v);
    if (i >= 0) { this.uso.prioridades.splice(i, 1); return; }
    if (this.uso.prioridades.length >= this.maxPrioridades) this.uso.prioridades.shift();
    this.uso.prioridades.push(v);
  }

  prioritario(v: string): boolean {
    return this.uso.prioridades.includes(v);
  }

  descartar(): void {
    this.uso = structuredClone(this.usoOriginal);
    this.conta = structuredClone(this.contaOriginal);
  }

  salvar(): void {
    if (!this.alteracoes) return;
    this.usoOriginal = structuredClone(this.uso);
    this.contaOriginal = structuredClone(this.conta);
    this.salvarPerfil.emit({ uso: this.uso, conta: this.conta });
  }
}