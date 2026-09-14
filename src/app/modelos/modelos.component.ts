import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../topbar/topbar.component';

export type Motorizacao = 'combustao' | 'hibrido' | 'eletrico';
export type Ordenacao = 'compatibilidade' | 'preco' | 'nome';

export interface Modelo {
  id: string;
  nome: string;
  /** Rótulo curto exibido acima do nome: 'SUV médio', 'Picape compacta'… */
  segmento: string;
  /** Usado pelo filtro lateral: 'suv', 'picape', 'esportivo', 'comercial'. */
  categoria: string;
  motorizacao: Motorizacao;
  precoDe: number;
  /** Duas linhas curtas de ficha: motor e tração/lugares. */
  ficha: string[];
  /** Nota de compatibilidade com o perfil. Nulo quando não há perfil preenchido. */
  nota: number | null;
  imagem?: string;
}

export interface Categoria { chave: string; rotulo: string; }

@Component({
  selector: 'seia-modelos',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './modelos.component.html',
  styleUrl: './modelos.component.css',
})
export class ModelosComponent {
  @Output() abrirModelo = new EventEmitter<string>();
  @Output() compararSelecionados = new EventEmitter<string[]>();
  @Output() navegar = new EventEmitter<string>();

  @Input() modelos: Modelo[] = [];
  /** Resumo do perfil, exibido sob o título. Nulo esconde a linha. */
  @Input() perfil: string | null = 'família · estrada · até R$ 250 mil';

  readonly categorias: Categoria[] = [
    { chave: 'todos', rotulo: 'Todos' },
    { chave: 'suv', rotulo: 'SUVs' },
    { chave: 'picape', rotulo: 'Picapes' },
    { chave: 'esportivo', rotulo: 'Esportivos' },
    { chave: 'comercial', rotulo: 'Comerciais' },
  ];

  readonly motorizacoes: { chave: Motorizacao; rotulo: string }[] = [
    { chave: 'combustao', rotulo: 'Combustão' },
    { chave: 'hibrido', rotulo: 'Híbrido' },
    { chave: 'eletrico', rotulo: 'Elétrico' },
  ];

  readonly ordenacoes: { chave: Ordenacao; rotulo: string }[] = [
    { chave: 'compatibilidade', rotulo: 'compatibilidade' },
    { chave: 'preco', rotulo: 'preço' },
    { chave: 'nome', rotulo: 'nome' },
  ];

  /** Abaixo disso a barra clareia: está listado, mas fora do perfil. */
  readonly corteFraco = 70;
  readonly maxComparar = 3;

  categoria = 'todos';
  motorizacoesAtivas = new Set<Motorizacao>();
  tetoPreco = 350000;
  soCompativeis = false;
  termo = '';
  ordem: Ordenacao = 'compatibilidade';
  selecionados = new Set<string>();

  get precoMinimo(): number {
    return this.modelos.length ? Math.min(...this.modelos.map((m) => m.precoDe)) : 0;
  }

  get precoMaximo(): number {
    return this.modelos.length ? Math.max(...this.modelos.map((m) => m.precoDe)) : 0;
  }

  contagem(chave: string): number {
    return chave === 'todos'
      ? this.modelos.length
      : this.modelos.filter((m) => m.categoria === chave).length;
  }

  get filtrados(): Modelo[] {
    const termo = this.termo.trim().toLowerCase();

    const lista = this.modelos.filter((m) => {
      if (this.categoria !== 'todos' && m.categoria !== this.categoria) return false;
      if (this.motorizacoesAtivas.size && !this.motorizacoesAtivas.has(m.motorizacao)) return false;
      if (m.precoDe > this.tetoPreco) return false;
      if (this.soCompativeis && (m.nota ?? 0) < this.corteFraco) return false;
      if (termo && !m.nome.toLowerCase().includes(termo) && !m.segmento.toLowerCase().includes(termo)) return false;
      return true;
    });

    return lista.sort((a, b) => {
      if (this.ordem === 'preco') return a.precoDe - b.precoDe;
      if (this.ordem === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
      return (b.nota ?? -1) - (a.nota ?? -1);
    });
  }

  alternarMotorizacao(m: Motorizacao): void {
    this.motorizacoesAtivas.has(m)
      ? this.motorizacoesAtivas.delete(m)
      : this.motorizacoesAtivas.add(m);
  }

  alternarSelecao(id: string, evento: Event): void {
    evento.stopPropagation();
    if (this.selecionados.has(id)) { this.selecionados.delete(id); return; }
    if (this.selecionados.size >= this.maxComparar) return;
    this.selecionados.add(id);
  }

  limparSelecao(): void {
    this.selecionados.clear();
  }

  comparar(): void {
    if (this.selecionados.size < 2) return;
    this.compararSelecionados.emit([...this.selecionados]);
  }

  preco(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
}