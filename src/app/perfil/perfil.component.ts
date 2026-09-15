import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';

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

interface ModeloAvaliado {
  /** Mesmo id usado em /modelos — é o que vira favorito/comparação lá. */
  id: string;
  nome: string;
  precoDe: number;
  /** 'cidade' | 'estrada' | 'offroad' | 'trabalho' — combina com o campo "Uso principal". */
  tags: string[];
  espacoBom: boolean;
  confortoBom: boolean;
  consumoBom: boolean;
  potenciaBoa: boolean;
}

/** Mesma linha e mesmos ids do /modelos, com sinalizadores usados só pra pontuar a prévia do perfil. */
const CATALOGO_PERFIL: ModeloAvaliado[] = [
  { id: 'territory', nome: 'Territory', precoDe: 219900, tags: ['cidade', 'estrada'], espacoBom: true, confortoBom: true, consumoBom: false, potenciaBoa: false },
  { id: 'bronco-sport', nome: 'Bronco Sport', precoDe: 249900, tags: ['offroad', 'cidade'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: false },
  { id: 'explorer', nome: 'Explorer', precoDe: 429900, tags: ['estrada', 'cidade'], espacoBom: true, confortoBom: true, consumoBom: false, potenciaBoa: false },
  { id: 'f-150', nome: 'F-150', precoDe: 439900, tags: ['trabalho', 'offroad'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: true },
  { id: 'ranger', nome: 'Ranger', precoDe: 259900, tags: ['trabalho', 'offroad'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: false },
  { id: 'ranger-raptor', nome: 'Ranger Raptor', precoDe: 399900, tags: ['offroad', 'trabalho'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: true },
  { id: 'maverick-hybrid', nome: 'Maverick Hybrid', precoDe: 219900, tags: ['cidade', 'trabalho'], espacoBom: false, confortoBom: true, consumoBom: true, potenciaBoa: false },
  { id: 'maverick-tremor', nome: 'Maverick Tremor', precoDe: 249900, tags: ['offroad'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: false },
  { id: 'mustang-gt', nome: 'Mustang GT', precoDe: 549900, tags: ['estrada'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: true },
  { id: 'mustang-mach-e', nome: 'Mustang Mach-E', precoDe: 379900, tags: ['cidade', 'estrada'], espacoBom: true, confortoBom: true, consumoBom: true, potenciaBoa: false },
  { id: 'f-150-lightning', nome: 'F-150 Lightning', precoDe: 599900, tags: ['trabalho'], espacoBom: false, confortoBom: false, consumoBom: true, potenciaBoa: true },
  { id: 'transit-furgao', nome: 'Transit Furgão', precoDe: 219900, tags: ['trabalho'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: false },
  { id: 'transit-minibus', nome: 'Transit Minibus', precoDe: 239900, tags: ['trabalho', 'estrada'], espacoBom: true, confortoBom: false, consumoBom: false, potenciaBoa: false },
];

const TAG_POR_USO: Record<string, string> = {
  Cidade: 'cidade',
  Estrada: 'estrada',
  'Off-road': 'offroad',
  Trabalho: 'trabalho',
};

@Component({
  selector: 'seia-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, RodapeComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent {
  private router = inject(Router);

  private readonly chavePerfilSalvo = 'seia-perfil-salvo';

  constructor() {
    this.carregarSalvo();
    this.usoOriginal = structuredClone(this.uso);
    this.contaOriginal = structuredClone(this.conta);
    this.sincronizarComModelos();
  }

  /** Restaura o que foi salvo antes — sem isso, um F5 devolveria os campos a zero mesmo depois de "Salvar". */
  private carregarSalvo(): void {
    try {
      const salvo = localStorage.getItem(this.chavePerfilSalvo);
      if (!salvo) return;
      const dados = JSON.parse(salvo) as { uso: PerfilUso; conta: DadosConta };
      if (dados.uso) this.uso = { ...this.uso, ...dados.uso };
      if (dados.conta) this.conta = { ...this.conta, ...dados.conta };
    } catch {
      // localStorage indisponível ou dado corrompido — segue com os campos em branco.
    }
  }

  private persistir(): void {
    try {
      localStorage.setItem(this.chavePerfilSalvo, JSON.stringify({ uso: this.uso, conta: this.conta }));
    } catch {
      // localStorage indisponível — o perfil vale só para esta sessão.
    }
  }

  ir(chave: string): void {
    this.navegar.emit(chave);
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    this.router.navigateByUrl('/');
  }

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
    rodagem: '',
    orcamento: '',
    prioridades: ['Consumo', 'Espaço'],
  };

  @Input() conta: DadosConta = {
    nome: '',
    telefone: '',
    email: 'anthonio@gmail.com',
    criadaEm: '02/04/2026',
  };

  /** Ranking completo (14 modelos) recalculado a cada ajuste no perfil de uso — não espera "Salvar". */
  private calcularRanking(): { id: string; modelo: string; nota: number; combinaComUso: boolean }[] {
    const orcamento = this.orcamentoNumero();
    const tagDeUso = TAG_POR_USO[this.uso.uso];

    const pontuados = CATALOGO_PERFIL.map((m) => {
      const combinaComUso = !!tagDeUso && m.tags.includes(tagDeUso);
      let nota = 50;

      if (combinaComUso) nota += 20;
      if (this.uso.passageiros === '5 ou mais' && m.espacoBom) nota += 10;
      if (this.uso.passageiros === '1 ou 2' && !m.espacoBom) nota += 6;

      for (const p of this.uso.prioridades) {
        if (p === 'Consumo' && m.consumoBom) nota += 20;
        if (p === 'Espaço' && m.espacoBom) nota += 20;
        if (p === 'Conforto' && m.confortoBom) nota += 20;
        if (p === 'Potência' && m.potenciaBoa) nota += 20;
      }

      if (orcamento) {
        if (m.precoDe > orcamento) nota -= 35;
        else if (m.precoDe <= orcamento * 0.8) nota += 5;
      }

      return { id: m.id, modelo: m.nome, nota: Math.max(15, Math.min(97, Math.round(nota))), combinaComUso };
    });

    pontuados.sort((a, b) => b.nota - a.nota);
    return pontuados;
  }

  get previa(): Previa {
    const [primeiro, ...resto] = this.calcularRanking();
    return { modelo: primeiro.modelo, nota: primeiro.nota, outros: resto.slice(0, 2) };
  }

  private orcamentoNumero(): number | null {
    const digitos = this.uso.orcamento.replace(/\D/g, '');
    return digitos ? Number(digitos) : null;
  }

  private readonly chaveFavoritos = 'seia-favoritos';
  private readonly chaveComparacoesUltima = 'seia-comparacoes-ultima';

  /** Contagens lidas do que o perfil atual está sugerindo — a mesma lista que aparece em /modelos. */
  get atalhos(): { chave: string; rotulo: string; contagem: number }[] {
    return [
      { chave: 'favoritos', rotulo: 'Favoritos', contagem: this.contarSalvos(this.chaveFavoritos) },
      { chave: 'comparacoes', rotulo: 'Minhas comparações', contagem: this.contarSalvos(this.chaveComparacoesUltima) },
    ];
  }

  private lerStorage(chave: string): string | null {
    try {
      return localStorage.getItem(chave);
    } catch {
      return null;
    }
  }

  private contarSalvos(chave: string): number {
    const salvo = this.lerStorage(chave);
    if (!salvo) return 0;
    try {
      return (JSON.parse(salvo) as unknown[]).length;
    } catch {
      return 0;
    }
  }

  /**
   * Favorita TODOS os modelos que combinam com o "Uso principal" escolhido — não é um top 3 fixo,
   * varia conforme quantos modelos realmente têm aquela tag (ex.: Off-road tem 5, Trabalho tem 6...).
   * A comparação é sempre o top 3 exato do painel "Com este perfil" (modelo + outros), sem o filtro
   * de uso — assim "Minhas comparações" bate certinho com o que aparece ali.
   */
  private sincronizarComModelos(): void {
    const ranking = this.calcularRanking();
    const combinam = ranking.filter((r) => r.combinaComUso);
    const baseFavoritos = combinam.length ? combinam : ranking;

    const favoritosIds = baseFavoritos.map((r) => r.id);
    const comparacaoIds = ranking.slice(0, 3).map((r) => r.id);

    try {
      localStorage.setItem(this.chaveFavoritos, JSON.stringify(favoritosIds));
      localStorage.setItem(this.chaveComparacoesUltima, JSON.stringify(comparacaoIds));
    } catch {
      // localStorage indisponível — a sugestão vale só pra esta sessão.
    }
  }

  irAtalho(chave: string): void {
    this.navegar.emit(chave);
    if (chave === 'favoritos') {
      this.router.navigate(['/modelos'], { queryParams: { favoritos: '1' } });
    } else if (chave === 'comparacoes') {
      this.router.navigate(['/modelos'], { queryParams: { ultimaComparacao: '1' } });
    }
  }

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

  escolherUso(v: string): void { this.uso.uso = v; this.sincronizarComModelos(); }
  escolherPassageiros(v: string): void { this.uso.passageiros = v; this.sincronizarComModelos(); }

  alternarPrioridade(v: string): void {
    const i = this.uso.prioridades.indexOf(v);
    if (i >= 0) { this.uso.prioridades.splice(i, 1); }
    else {
      if (this.uso.prioridades.length >= this.maxPrioridades) this.uso.prioridades.shift();
      this.uso.prioridades.push(v);
    }
    this.sincronizarComModelos();
  }

  /** Rodagem e orçamento são texto livre — chamado pelo (ngModelChange) desses dois campos. */
  aoDigitarUso(): void {
    this.sincronizarComModelos();
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
    this.persistir();
    this.salvarPerfil.emit({ uso: this.uso, conta: this.conta });
  }
}