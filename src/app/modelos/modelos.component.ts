import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { LinhasDeLuzComponent } from '../shared/linhas-de-luz.component';
import { calcularNota, formatarPerfil } from '../shared/recomendacao-ia';
import { AuthService } from '../auth.service';
import { ProfileService } from '../profile.service';

export type Motorizacao = 'combustao' | 'hibrido' | 'eletrico';
export type Ordenacao = 'compatibilidade' | 'preco' | 'nome';

/** Uma célula da tabela de comparação; `selo` marca o melhor da linha ("Menor preço"). */
export interface CelulaComparacao {
  texto: string;
  selo?: string;
  /** true quando o selo é o cinza "Empate" (vários carros dividem o melhor valor). */
  empate?: boolean;
}

export interface LinhaComparacao {
  rotulo: string;
  celulas: CelulaComparacao[];
  /** Todos os carros têm o mesmo valor: a linha não diferencia e aparece esmaecida. */
  igual: boolean;
}

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

/** Modelos sem versão cadastrada na API da Ford (busca lá não acha nada) — o card não abre a ficha no Dashboard. */
const SEM_FICHA_DASHBOARD = new Set(['maverick-tremor', 'mustang-mach-e', 'f-150-lightning', 'transit-furgao', 'transit-minibus']);

@Component({
  selector: 'seia-modelos',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, RodapeComponent, LinhasDeLuzComponent],
  templateUrl: './modelos.component.html',
  styleUrl: './modelos.component.css',
  host: { class: 'seia-pagina' },
})
export class ModelosComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private route = inject(ActivatedRoute);


  ir(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  /** false para modelos sem versão na API da Ford: o card não abre a ficha no Dashboard. */
  temFicha(m: Modelo): boolean {
    return !SEM_FICHA_DASHBOARD.has(m.id);
  }

  /** Abre a ficha técnica do modelo no Dashboard, que busca na API da Ford. */
  abrirFicha(m: Modelo): void {
    if (!this.temFicha(m)) return;
    this.registrarEvento(m, 'view');
    this.router.navigate(['/dashboard'], { queryParams: { modelo: m.nome } });
  }

  sair(): void {
    void this.authService.logout();
  }

  modelos: Modelo[] = [
    { id: 'bronco-sport', nome: 'Bronco Sport', segmento: 'SUV compacto', categoria: 'suv', motorizacao: 'combustao', precoDe: 249900, ficha: ['1.5 EcoBoost turbo · 182 cv', 'Tração 4x2 · 5 lugares'], nota: 81, imagem: 'bronco-sport.jpeg', imagemVistas: 'bronco-sport-vistas.jpg', tags: ['offroad', 'aventura', 'familia'] },
    { id: 'explorer', nome: 'Explorer', segmento: 'SUV grande', categoria: 'suv', motorizacao: 'combustao', precoDe: 429900, ficha: ['2.3 EcoBoost turbo · 300 cv', 'Tração 4x2 · 7 lugares'], nota: 42, imagem: 'explorer.jpeg', imagemVistas: 'explorer-vistas.jpg', tags: ['familia', 'viagem', 'estrada'] },
    { id: 'territory', nome: 'Territory', segmento: 'SUV médio', categoria: 'suv', motorizacao: 'combustao', precoDe: 219900, ficha: ['1.5 turbo · 177 cv', 'Tração 4x2 · 5 lugares'], nota: 94, imagem: 'territory.jpeg', imagemVistas: 'territory-vistas.jpg', tags: ['familia', 'viagem', 'estrada', 'cidade'] },

    { id: 'f-150', nome: 'F-150', segmento: 'Picape grande', categoria: 'picape', motorizacao: 'combustao', precoDe: 439900, ficha: ['3.5 V6 EcoBoost · 400 cv', 'Tração 4x4 · 5 lugares'], nota: 35, imagem: 'f150.jpg', imagemVistas: 'f150-vistas.jpg', tags: ['trabalho', 'carga', 'performance'] },
    { id: 'ranger', nome: 'Ranger', segmento: 'Picape média', categoria: 'picape', motorizacao: 'combustao', precoDe: 259900, ficha: ['3.0 V6 Turbo Diesel · 250 cv', 'Tração 4x4 · 5 lugares'], nota: 63, imagem: 'ranger.jpg', imagemVistas: 'ranger-vistas.jpg', tags: ['trabalho', 'offroad', 'carga'] },
    { id: 'ranger-raptor', nome: 'Ranger Raptor', segmento: 'Picape de performance', categoria: 'picape', motorizacao: 'combustao', precoDe: 399900, ficha: ['3.0 V6 Twin-Turbo · 397 cv', 'Tração 4x4 · 5 lugares'], nota: 38, imagem: 'ranger-raptor.jpg', imagemVistas: 'ranger-raptor-vistas.jpg', tags: ['performance', 'offroad', 'aventura'] },
    { id: 'maverick-hybrid', nome: 'Maverick Hybrid', segmento: 'Picape compacta', categoria: 'picape', motorizacao: 'hibrido', precoDe: 219900, ficha: ['2.5 Híbrido · 191 cv', 'Tração 4x2 · 5 lugares'], nota: 86, imagem: 'maverick-hybrid.jpg', imagemVistas: 'maverick-hybrid-vistas.jpg', tags: ['cidade', 'economia', 'trabalho'] },
    { id: 'maverick-tremor', nome: 'Maverick Tremor', segmento: 'Picape compacta off-road', categoria: 'picape', motorizacao: 'combustao', precoDe: 249900, ficha: ['2.0 EcoBoost turbo · 250 cv', 'Tração 4x4 · 5 lugares'], nota: 68, imagem: 'maverick-tremor.jpg', imagemVistas: 'maverick-tremor-vistas.jpg', tags: ['offroad', 'aventura'] },

    { id: 'mustang-gt', nome: 'Mustang GT', segmento: 'Esportivo', categoria: 'esportivo', motorizacao: 'combustao', precoDe: 549900, ficha: ['5.0 V8 · 480 cv', 'Tração traseira · 4 lugares'], nota: 22, imagem: 'mustang.jpeg', imagemVistas: 'mustang-vistas.jpg', tags: ['performance'] },

    { id: 'mustang-mach-e', nome: 'Mustang Mach-E', segmento: 'SUV elétrico', categoria: 'suv', motorizacao: 'eletrico', precoDe: 379900, ficha: ['Motor elétrico · 351 cv', 'Autonomia até 500 km · 5 lugares'], nota: 51, imagem: 'mach-e.jpg', imagemVistas: 'mach-e-vistas.jpg', tags: ['cidade', 'eletrico', 'familia'] },
    { id: 'f-150-lightning', nome: 'F-150 Lightning', segmento: 'Picape elétrica', categoria: 'picape', motorizacao: 'eletrico', precoDe: 599900, ficha: ['Motor elétrico duplo · 580 cv', 'Tração 4x4 · 5 lugares'], nota: 18, imagem: 'f150-lightning.jpg', imagemVistas: 'f150-lightning-vistas.jpg', tags: ['trabalho', 'eletrico'] },

    { id: 'transit-furgao', nome: 'Transit Furgão', segmento: 'Van de carga', categoria: 'comercial', motorizacao: 'combustao', precoDe: 219900, ficha: ['2.2 Turbo Diesel · 125 cv', 'Capacidade até 1.5 t · 3 lugares'], nota: 33, imagem: 'transit-furgao.jpeg', imagemVistas: 'transit-furgao-vistas.jpg', tags: ['trabalho', 'carga'] },
    { id: 'transit-minibus', nome: 'Transit Minibus', segmento: 'Van de passageiros', categoria: 'comercial', motorizacao: 'combustao', precoDe: 239900, ficha: ['2.2 Turbo Diesel · 125 cv', 'Até 16 lugares'], nota: 74, imagem: 'transit-minibus.jpeg', imagemVistas: 'transit-minibus-vistas.jpg', tags: ['trabalho', 'viagem'] },
  ];
  /** Resumo do perfil, exibido sob o título. Nulo esconde a linha. */
  perfil: string | null = 'família · estrada · até R$ 250 mil';

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
  /** Quantos carros aparecem com foto na barra de comparação; o resto vira "+ N carro(s)". */
  readonly fotosNaBarra = 3;

  /** Os primeiros carros escolhidos (na ordem em que foram marcados), com foto na barra. */
  get escolhidosNaBarra(): Modelo[] {
    return [...this.selecionados]
      .slice(0, this.fotosNaBarra)
      .map((id) => this.modelos.find((m) => m.id === id))
      .filter((m): m is Modelo => !!m);
  }

  /** Carros escolhidos além dos que aparecem com foto. */
  get restantesNaBarra(): number {
    return Math.max(0, this.selecionados.size - this.fotosNaBarra);
  }

  /** "+ 1 carro" / "+ 2 carros": singular para um, plural para mais de um. */
  get rotuloRestantes(): string {
    const n = this.restantesNaBarra;
    return `+ ${n} ${n === 1 ? 'carro' : 'carros'}`;
  }

  /** Nomes dos carros que ficaram de fora da barra (dica ao passar o mouse no "+ N"). */
  get nomesRestantes(): string {
    return [...this.selecionados]
      .slice(this.fotosNaBarra)
      .map((id) => this.modelos.find((m) => m.id === id)?.nome)
      .filter(Boolean)
      .join(', ');
  }

  /** Sem limite fixo: dá para comparar até o total de carros do catálogo (a tabela rola na horizontal). */
  get maxComparar(): number {
    return this.modelos.length;
  }

  categoria = 'todos';
  motorizacoesAtivas = new Set<Motorizacao>();
  tetoPreco = 599900;
  soCompativeis = false;
  /** Painel de filtros (motorização, preço, favoritos): aberto no computador, recolhido no celular até tocar em "Filtros". */
  filtrosAbertos = typeof window === 'undefined' || window.innerWidth > 900;
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
    } else {
      // Sem busca no /portal não há perfil: esconde as notas de demonstração para não passar por resultado real.
      this.perfil = null;
      this.modelos = this.modelos.map((m) => ({ ...m, nota: null }));
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

  /** Quantos filtros estão ligados (mostrado no botão "Filtros" do celular). */
  get filtrosAtivos(): number {
    return (
      (this.categoria !== 'todos' ? 1 : 0) +
      this.motorizacoesAtivas.size +
      (this.tetoPreco < this.precoMaximo ? 1 : 0) +
      (this.soCompativeis ? 1 : 0) +
      (this.soFavoritos ? 1 : 0)
    );
  }

  get precoMaximo(): number {
    return this.modelos.length ? Math.max(...this.modelos.map((m) => m.precoDe)) : 0;
  }

  /** Rótulo da categoria escolhida ("SUVs", "Picapes"…), usado no resumo acima da lista. */
  get rotuloCategoria(): string {
    return this.categorias.find((c) => c.chave === this.categoria)?.rotulo ?? '';
  }

  /** Desliga todos os filtros e a busca por nome (a ordenação e a seleção para comparar ficam como estão). */
  limparFiltros(): void {
    this.categoria = 'todos';
    this.motorizacoesAtivas.clear();
    this.tetoPreco = this.precoMaximo;
    this.soCompativeis = false;
    this.soFavoritos = false;
    this.termo = '';
  }

  /** "Combustão", "Híbrido" ou "Elétrico" — mostrado na etiqueta sobre a foto. */
  rotuloMotorizacao(m: Modelo): string {
    return this.motorizacoes.find((x) => x.chave === m.motorizacao)?.rotulo ?? '';
  }

  /** Só o motor, sem a potência: "1.5 EcoBoost turbo", "2.2 Turbo Diesel"… (primeiro trecho da ficha). */
  motorDoModelo(m: Modelo): string {
    return (m.ficha[0] ?? '').split('·')[0].trim();
  }

  /**
   * Até três números de destaque do cartão (potência, tração ou autonomia/capacidade, lugares), lidos das
   * duas linhas de ficha. O que a ficha não tem simplesmente não aparece.
   */
  destaques(m: Modelo): { rotulo: string; valor: string }[] {
    const partes = m.ficha.flatMap((linha) => linha.split('·')).map((p) => p.trim());
    const achar = (regra: RegExp) => partes.find((p) => regra.test(p));
    const itens: { rotulo: string; valor: string }[] = [];

    const cv = achar(/\d+\s*cv/i)?.match(/\d+/)?.[0];
    if (cv) itens.push({ rotulo: 'Potência', valor: `${cv} cv` });

    const tracao = achar(/^Tração/i);
    const extra = achar(/^(Autonomia|Capacidade)/i);
    if (tracao) {
      itens.push({ rotulo: 'Tração', valor: tracao.replace(/^Tração\s*/i, '') });
    } else if (extra) {
      const rotulo = /^Autonomia/i.test(extra) ? 'Autonomia' : 'Capacidade';
      itens.push({ rotulo, valor: extra.replace(/^(Autonomia|Capacidade)(\s+até)?\s*/i, '') });
    }

    const lugares = achar(/lugares/i)?.match(/\d+/)?.[0];
    if (lugares) itens.push({ rotulo: 'Lugares', valor: lugares });

    return itens;
  }

  /**
   * Ficha curta do cartão, numa linha: "182 cv · 4x2 · 5 lugares". Elétricos e híbridos abrem com o tipo de motor
   * ("Elétrico · 580 cv · 4x4 · 5 lugares"). O que a ficha não tem simplesmente não aparece.
   */
  resumoCurto(m: Modelo): string {
    const d = this.destaques(m);
    const valor = (rotulo: string) => d.find((x) => x.rotulo === rotulo)?.valor;
    const lugares = valor('Lugares');
    const partes = [
      m.motorizacao !== 'combustao' ? this.rotuloMotorizacao(m) : null,
      valor('Potência'),
      valor('Tração') ?? valor('Autonomia') ?? valor('Capacidade'),
      lugares ? `${lugares} lugares` : null,
    ];
    return partes.filter(Boolean).join(' · ');
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
    const adicionando = !this.favoritos.has(id);
    adicionando ? this.favoritos.add(id) : this.favoritos.delete(id);
    const modelo = this.modelos.find((item) => item.id === id);
    if (modelo) this.registrarEvento(modelo, adicionando ? 'favorite' : 'unfavorite');
    try {
      localStorage.setItem(this.chaveFavoritos, JSON.stringify([...this.favoritos]));
    } catch {
      // localStorage indisponível — o favorito vale só para esta sessão.
    }
    this.profileService.salvarFavoritos([...this.favoritos]).subscribe({ error: () => { /* Analytics não bloqueia o catálogo. */ } });
  }

  alternarSelecao(id: string, evento: Event): void {
    evento.stopPropagation();
    if (this.selecionados.has(id)) {
      this.selecionados.delete(id);
    } else {
      if (this.selecionados.size >= this.maxComparar) return;
      this.selecionados.add(id);
    }
    this.persistirSelecao();
  }

  /** Mesmo padrão do favorito: salva a cada mudança, sem esperar o clique em "Comparar" — o atalho do perfil lê daqui. */
  private persistirSelecao(): void {
    try {
      localStorage.setItem(this.chaveUltimaComparacao, JSON.stringify([...this.selecionados]));
    } catch {
      // localStorage indisponível — a seleção vale só para esta sessão.
    }
  }

  limparSelecao(): void {
    this.selecionados.clear();
    this.compararAtivo = false;
    this.persistirSelecao();
  }

  get modelosComparados(): Modelo[] {
    const ids = [...this.selecionados];
    return this.modelos.filter((m) => ids.includes(m.id));
  }

  /**
   * Linhas da tabela de comparação, com o melhor de cada uma destacado:
   * - um vencedor único (menor preço, maior potência) ganha o selo verde;
   * - vários carros empatados no melhor valor ganham, cada um, o selo cinza "Empate";
   * - uma linha em que todos são iguais fica esmaecida (`igual`), porque ali os carros não se diferenciam.
   */
  get linhasComparacao(): LinhaComparacao[] {
    const ms = this.modelosComparados;
    const valorDe = (m: Modelo, rotulo: string) => this.destaques(m).find((d) => d.rotulo === rotulo)?.valor ?? null;
    const numero = (texto: string | null) => (texto ? Number(texto.replace(/\D/g, '')) || null : null);

    const linha = (rotulo: string, textos: (string | null)[], melhor?: { indices: number[]; selo: string }): LinhaComparacao => {
      const empate = (melhor?.indices.length ?? 0) > 1;
      const celulas: CelulaComparacao[] = textos.map((texto, i) => {
        const vence = !!melhor?.indices.includes(i);
        return { texto: texto ?? '—', selo: vence ? (empate ? 'Empate' : melhor?.selo) : undefined, empate: vence && empate ? true : undefined };
      });
      const igual = celulas.length > 1 && celulas[0].texto !== '—' && celulas.every((c) => c.texto === celulas[0].texto);
      return { rotulo, celulas, igual };
    };

    /** Índices do menor/maior valor, só quando há diferença entre os modelos comparados. */
    const vencedores = (valores: (number | null)[], menor: boolean): number[] => {
      const validos = valores.filter((v): v is number => v !== null);
      if (validos.length < 2 || new Set(validos).size < 2) return [];
      const alvo = menor ? Math.min(...validos) : Math.max(...validos);
      return valores.flatMap((v, i) => (v === alvo ? [i] : []));
    };

    const potencias = ms.map((m) => numero(valorDe(m, 'Potência')));
    const tracaoOuCapacidade = ms.map((m) => {
      const d = this.destaques(m).find((x) => ['Tração', 'Autonomia', 'Capacidade'].includes(x.rotulo));
      return d ? `${d.rotulo} ${d.valor}` : null;
    });
    const lugares = ms.map((m) => valorDe(m, 'Lugares'));

    return [
      linha('Preço a partir de', ms.map((m) => this.preco(m.precoDe)), { indices: vencedores(ms.map((m) => m.precoDe), true), selo: 'Menor preço' }),
      linha('Motorização', ms.map((m) => this.rotuloMotorizacao(m))),
      linha('Motor', ms.map((m) => this.motorDoModelo(m) || null)),
      linha('Potência', ms.map((m) => valorDe(m, 'Potência')), { indices: vencedores(potencias, false), selo: 'Mais potente' }),
      linha('Tração e capacidade', tracaoOuCapacidade),
      linha('Lugares', lugares.map((l) => (l ? `${l} lugares` : null))),
    ];
  }

  comparar(): void {
    if (this.selecionados.size < 2) return;
    this.compararAtivo = true;

    for (const id of this.selecionados) {
      const modelo = this.modelos.find((item) => item.id === id);
      if (modelo) this.registrarEvento(modelo, 'compare');
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
    this.persistirSelecao();
  }

  preco(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  private registrarEvento(modelo: Modelo, tipo: 'view' | 'favorite' | 'unfavorite' | 'compare'): void {
    this.profileService.registrarEvento(modelo.id, tipo, modelo.nome, {
      segmento: modelo.segmento,
      categoria: modelo.categoria,
      motorizacao: modelo.motorizacao,
      precoDe: modelo.precoDe,
    }).subscribe({ error: () => { /* Analytics não pode bloquear a experiência do catálogo. */ } });
  }
}