import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';

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
  private router = inject(Router);

  @Output() abrirModelo = new EventEmitter<string>();
  @Output() compararSelecionados = new EventEmitter<string[]>();
  @Output() navegar = new EventEmitter<string>();

  ir(chave: string): void {
    this.navegar.emit(chave);
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    this.router.navigateByUrl('/');
  }

  @Input() modelos: Modelo[] = [
    { id: 'bronco-sport', nome: 'Bronco Sport', segmento: 'SUV compacto', categoria: 'suv', motorizacao: 'combustao', precoDe: 249900, ficha: ['1.5 EcoBoost turbo · 182 cv', 'Tração 4x2 · 5 lugares'], nota: null, imagem: 'bronco-sport.jpeg' },
    { id: 'explorer', nome: 'Explorer', segmento: 'SUV grande', categoria: 'suv', motorizacao: 'combustao', precoDe: 429900, ficha: ['2.3 EcoBoost turbo · 300 cv', 'Tração 4x2 · 7 lugares'], nota: null, imagem: 'explorer.jpeg' },
    { id: 'territory', nome: 'Territory', segmento: 'SUV médio', categoria: 'suv', motorizacao: 'combustao', precoDe: 219900, ficha: ['1.5 turbo · 177 cv', 'Tração 4x2 · 5 lugares'], nota: null, imagem: 'territory.jpeg' },

    { id: 'f-150', nome: 'F-150', segmento: 'Picape grande', categoria: 'picape', motorizacao: 'combustao', precoDe: 439900, ficha: ['3.5 V6 EcoBoost · 400 cv', 'Tração 4x4 · 5 lugares'], nota: null, imagem: 'f150.jpg' },
    { id: 'ranger', nome: 'Ranger', segmento: 'Picape média', categoria: 'picape', motorizacao: 'combustao', precoDe: 259900, ficha: ['3.0 V6 Turbo Diesel · 250 cv', 'Tração 4x4 · 5 lugares'], nota: null, imagem: 'ranger.jpg' },
    { id: 'ranger-raptor', nome: 'Ranger Raptor', segmento: 'Picape de performance', categoria: 'picape', motorizacao: 'combustao', precoDe: 399900, ficha: ['3.0 V6 Twin-Turbo · 397 cv', 'Tração 4x4 · 5 lugares'], nota: null, imagem: 'ranger-raptor.jpg' },
    { id: 'maverick-hybrid', nome: 'Maverick Hybrid', segmento: 'Picape compacta', categoria: 'picape', motorizacao: 'hibrido', precoDe: 219900, ficha: ['2.5 Híbrido · 191 cv', 'Tração 4x2 · 5 lugares'], nota: null, imagem: 'maverick-hybrid.jpg' },
    { id: 'maverick-tremor', nome: 'Maverick Tremor', segmento: 'Picape compacta off-road', categoria: 'picape', motorizacao: 'combustao', precoDe: 249900, ficha: ['2.0 EcoBoost turbo · 250 cv', 'Tração 4x4 · 5 lugares'], nota: null, imagem: 'maverick-tremor.jpg' },

    { id: 'mustang-gt', nome: 'Mustang GT', segmento: 'Esportivo', categoria: 'esportivo', motorizacao: 'combustao', precoDe: 549900, ficha: ['5.0 V8 · 480 cv', 'Tração traseira · 4 lugares'], nota: null, imagem: 'mustang.jpg' },

    { id: 'mustang-mach-e', nome: 'Mustang Mach-E', segmento: 'SUV elétrico', categoria: 'suv', motorizacao: 'eletrico', precoDe: 379900, ficha: ['Motor elétrico · 351 cv', 'Autonomia até 500 km'], nota: null, imagem: 'mach-e.jpg' },
    { id: 'f-150-lightning', nome: 'F-150 Lightning', segmento: 'Picape elétrica', categoria: 'picape', motorizacao: 'eletrico', precoDe: 599900, ficha: ['Motor elétrico duplo · 580 cv', 'Tração 4x4 · 5 lugares'], nota: null, imagem: 'f150-lightning.jpg' },
    { id: 'e-transit', nome: 'E-Transit', segmento: 'Van elétrica', categoria: 'comercial', motorizacao: 'eletrico', precoDe: 349900, ficha: ['Motor elétrico · 269 cv', 'Autonomia até 300 km'], nota: null, imagem: 'e-transit.jpeg' },

    { id: 'transit-furgao', nome: 'Transit Furgão', segmento: 'Van de carga', categoria: 'comercial', motorizacao: 'combustao', precoDe: 219900, ficha: ['2.2 Turbo Diesel · 125 cv', 'Capacidade até 1.5 t'], nota: null, imagem: 'transit-furgao.jpeg' },
    { id: 'transit-minibus', nome: 'Transit Minibus', segmento: 'Van de passageiros', categoria: 'comercial', motorizacao: 'combustao', precoDe: 239900, ficha: ['2.2 Turbo Diesel · 125 cv', 'Até 16 lugares'], nota: null, imagem: 'transit-minibus.jpeg' },
  ];
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
  tetoPreco = 599900;
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