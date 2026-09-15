import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { calcularNota, formatarPerfil } from '../shared/recomendacao-ia';

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
  /** Colagem com os ângulos extras do carro (lateral, frente, motor, interior, porta-malas). */
  imagemVistas?: string;
  /** Palavras-chave de uso, mesmo dicionário do /portal — usadas pra recalcular a nota quando se chega aqui com um perfil de busca. */
  tags: string[];
}

export interface Categoria { chave: string; rotulo: string; }

@Component({
  selector: 'seia-modelos',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, RodapeComponent],
  templateUrl: './modelos.component.html',
  styleUrl: './modelos.component.css',
})
export class ModelosComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

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
    { id: 'bronco-sport', nome: 'Bronco Sport', segmento: 'SUV compacto', categoria: 'suv', motorizacao: 'combustao', precoDe: 249900, ficha: ['1.5 EcoBoost turbo · 182 cv', 'Tração 4x2 · 5 lugares'], nota: 81, imagem: 'bronco-sport.jpeg', imagemVistas: 'bronco-sport-vistas.jpg', tags: ['offroad', 'aventura', 'familia'] },
    { id: 'explorer', nome: 'Explorer', segmento: 'SUV grande', categoria: 'suv', motorizacao: 'combustao', precoDe: 429900, ficha: ['2.3 EcoBoost turbo · 300 cv', 'Tração 4x2 · 7 lugares'], nota: 42, imagem: 'explorer.jpeg', imagemVistas: 'explorer-vistas.jpg', tags: ['familia', 'viagem', 'estrada'] },
    { id: 'territory', nome: 'Territory', segmento: 'SUV médio', categoria: 'suv', motorizacao: 'combustao', precoDe: 219900, ficha: ['1.5 turbo · 177 cv', 'Tração 4x2 · 5 lugares'], nota: 94, imagem: 'territory.jpeg', imagemVistas: 'territory-vistas.jpg', tags: ['familia', 'viagem', 'estrada', 'cidade'] },

    { id: 'f-150', nome: 'F-150', segmento: 'Picape grande', categoria: 'picape', motorizacao: 'combustao', precoDe: 439900, ficha: ['3.5 V6 EcoBoost · 400 cv', 'Tração 4x4 · 5 lugares'], nota: 35, imagem: 'f150.jpg', imagemVistas: 'f150-vistas.jpg', tags: ['trabalho', 'carga', 'performance'] },
    { id: 'ranger', nome: 'Ranger', segmento: 'Picape média', categoria: 'picape', motorizacao: 'combustao', precoDe: 259900, ficha: ['3.0 V6 Turbo Diesel · 250 cv', 'Tração 4x4 · 5 lugares'], nota: 63, imagem: 'ranger.jpg', imagemVistas: 'ranger-vistas.jpg', tags: ['trabalho', 'offroad', 'carga'] },
    { id: 'ranger-raptor', nome: 'Ranger Raptor', segmento: 'Picape de performance', categoria: 'picape', motorizacao: 'combustao', precoDe: 399900, ficha: ['3.0 V6 Twin-Turbo · 397 cv', 'Tração 4x4 · 5 lugares'], nota: 38, imagem: 'ranger-raptor.jpg', imagemVistas: 'ranger-raptor-vistas.jpg', tags: ['performance', 'offroad', 'aventura'] },
    { id: 'maverick-hybrid', nome: 'Maverick Hybrid', segmento: 'Picape compacta', categoria: 'picape', motorizacao: 'hibrido', precoDe: 219900, ficha: ['2.5 Híbrido · 191 cv', 'Tração 4x2 · 5 lugares'], nota: 86, imagem: 'maverick-hybrid.jpg', imagemVistas: 'maverick-hybrid-vistas.jpg', tags: ['cidade', 'economia', 'trabalho'] },
    { id: 'maverick-tremor', nome: 'Maverick Tremor', segmento: 'Picape compacta off-road', categoria: 'picape', motorizacao: 'combustao', precoDe: 249900, ficha: ['2.0 EcoBoost turbo · 250 cv', 'Tração 4x4 · 5 lugares'], nota: 68, imagem: 'maverick-tremor.jpg', imagemVistas: 'maverick-tremor-vistas.jpg', tags: ['offroad', 'aventura'] },

    { id: 'mustang-gt', nome: 'Mustang GT', segmento: 'Esportivo', categoria: 'esportivo', motorizacao: 'combustao', precoDe: 549900, ficha: ['5.0 V8 · 480 cv', 'Tração traseira · 4 lugares'], nota: 22, imagem: 'mustang.jpeg', imagemVistas: 'mustang-vistas.jpg', tags: ['performance'] },

    { id: 'mustang-mach-e', nome: 'Mustang Mach-E', segmento: 'SUV elétrico', categoria: 'suv', motorizacao: 'eletrico', precoDe: 379900, ficha: ['Motor elétrico · 351 cv', 'Autonomia até 500 km'], nota: 51, imagem: 'mach-e.jpg', imagemVistas: 'mach-e-vistas.jpg', tags: ['cidade', 'eletrico', 'familia'] },
    { id: 'f-150-lightning', nome: 'F-150 Lightning', segmento: 'Picape elétrica', categoria: 'picape', motorizacao: 'eletrico', precoDe: 599900, ficha: ['Motor elétrico duplo · 580 cv', 'Tração 4x4 · 5 lugares'], nota: 18, imagem: 'f150-lightning.jpg', imagemVistas: 'f150-lightning-vistas.jpg', tags: ['trabalho', 'eletrico'] },

    { id: 'transit-furgao', nome: 'Transit Furgão', segmento: 'Van de carga', categoria: 'comercial', motorizacao: 'combustao', precoDe: 219900, ficha: ['2.2 Turbo Diesel · 125 cv', 'Capacidade até 1.5 t'], nota: 33, imagem: 'transit-furgao.jpeg', imagemVistas: 'transit-furgao-vistas.jpg', tags: ['trabalho', 'carga'] },
    { id: 'transit-minibus', nome: 'Transit Minibus', segmento: 'Van de passageiros', categoria: 'comercial', motorizacao: 'combustao', precoDe: 239900, ficha: ['2.2 Turbo Diesel · 125 cv', 'Até 16 lugares'], nota: 74, imagem: 'transit-minibus.jpeg', imagemVistas: 'transit-minibus-vistas.jpg', tags: ['trabalho', 'viagem'] },
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
  /** Pré-preenchido quando se chega aqui pelo "Ver ficha" do portal (?termo=Nome+do+modelo). */
  termo = this.route.snapshot.queryParamMap.get('termo') ?? '';
  ordem: Ordenacao = 'compatibilidade';
  selecionados = new Set<string>();
  compararAtivo = false;
  /** Modelo com o modal de fotos (vistas) aberto. Nulo quando fechado. */
  vistaAtiva: Modelo | null = null;

  private readonly chaveFavoritos = 'seia-favoritos';
  private readonly chaveUltimaComparacao = 'seia-comparacoes-ultima';

  favoritos = new Set<string>();
  /** Ligado quando se chega aqui pelo atalho "Meus favoritos" do perfil (?favoritos=1). */
  soFavoritos = this.route.snapshot.queryParamMap.get('favoritos') === '1';

  constructor() {
    try {
      const salvos = localStorage.getItem(this.chaveFavoritos);
      if (salvos) this.favoritos = new Set(JSON.parse(salvos));
    } catch {
      // localStorage indisponível — favoritos valem só para esta sessão.
    }

    if (this.route.snapshot.queryParamMap.get('ultimaComparacao') === '1') {
      try {
        const salvos = localStorage.getItem(this.chaveUltimaComparacao);
        const ids: string[] = salvos ? JSON.parse(salvos) : [];
        if (ids.length >= 2) {
          this.selecionados = new Set(ids);
          this.compararAtivo = true;
        }
      } catch {
        // sem última comparação salva — segue vazio.
      }
    }

    // Chegou aqui com um perfil de busca do /portal (?tags=familia,cidade&orcamento=250000) —
    // troca o perfil fixo de demonstração pelo perfil de verdade e recalcula a nota de cada modelo.
    const tagsParam = this.route.snapshot.queryParamMap.get('tags');
    if (tagsParam) {
      const tagsDetectadas = tagsParam.split(',').filter(Boolean);
      const orcamentoParam = this.route.snapshot.queryParamMap.get('orcamento');
      const orcamento = orcamentoParam ? Number(orcamentoParam) : null;

      this.perfil = formatarPerfil(tagsDetectadas, orcamento);
      this.modelos = this.modelos.map((m) => ({ ...m, nota: calcularNota(m.tags, tagsDetectadas, m.precoDe, orcamento) }));
    }

    // Tira os parâmetros da URL depois de usados — sem isso, um F5 na mesma URL
    // reabriria o modal de comparação (ou o filtro de favoritos) de novo sozinho.
    if (this.route.snapshot.queryParamMap.keys.length) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

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
      if (this.soFavoritos && !this.favoritos.has(m.id)) return false;
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

  alternarFavorito(id: string, evento: Event): void {
    evento.stopPropagation();
    this.favoritos.has(id) ? this.favoritos.delete(id) : this.favoritos.add(id);
    try {
      localStorage.setItem(this.chaveFavoritos, JSON.stringify([...this.favoritos]));
    } catch {
      // localStorage indisponível — o favorito vale só para esta sessão.
    }
  }

  alternarSelecao(id: string, evento: Event): void {
    evento.stopPropagation();
    if (this.selecionados.has(id)) { this.selecionados.delete(id); return; }
    if (this.selecionados.size >= this.maxComparar) return;
    this.selecionados.add(id);
  }

  limparSelecao(): void {
    this.selecionados.clear();
    this.compararAtivo = false;
  }

  get modelosComparados(): Modelo[] {
    const ids = [...this.selecionados];
    return this.modelos.filter((m) => ids.includes(m.id));
  }

  comparar(): void {
    if (this.selecionados.size < 2) return;
    this.compararAtivo = true;
    this.compararSelecionados.emit([...this.selecionados]);

    try {
      localStorage.setItem(this.chaveUltimaComparacao, JSON.stringify([...this.selecionados]));
    } catch {
      // localStorage indisponível — a comparação vale só para esta sessão.
    }
  }

  fecharComparacao(): void {
    this.compararAtivo = false;
  }

  abrirVistas(id: string, evento: Event): void {
    evento.stopPropagation();
    const modelo = this.modelos.find((m) => m.id === id);
    if (modelo?.imagemVistas) this.vistaAtiva = modelo;
  }

  fecharVistas(): void {
    this.vistaAtiva = null;
  }

  removerDaComparacao(id: string): void {
    this.selecionados.delete(id);
    if (this.selecionados.size < 2) this.compararAtivo = false;
  }

  preco(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
}