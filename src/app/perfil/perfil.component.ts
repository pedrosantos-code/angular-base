import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU, ICONES } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { AuthService } from '../auth.service';
import { fotoDoModelo } from '../shared/fotos-modelos';
import { avaliarUso, AvaliacaoUso, TipoMotor } from '../shared/rodagem';
import { salvarModeloRecomendado } from '../shared/modelo-recomendado';

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

/** Um carro da prévia: quanto do preço "a partir de" o orçamento cobre e quanto falta. */
export interface ItemPrevia {
  modelo: string;
  /** Porcentagem do preço coberta pelo orçamento (0 a 100); null quando o usuário não informou orçamento. */
  cobertura: number | null;
  /** Reais que faltam para chegar ao preço; 0 quando o orçamento cobre o carro (ou não há orçamento). */
  falta: number;
  /** Custo estimado de uso na rodagem mensal informada (ou o motivo de não haver). */
  uso: AvaliacaoUso;
}

export interface Previa extends ItemPrevia {
  outros: ItemPrevia[];
}

/**
 * Quanto do preço "a partir de" o orçamento cobre, em %: (orçamento ÷ preço) × 100, com teto de 100.
 * Arredonda sempre para baixo, para nunca mostrar mais do que a pessoa realmente tem.
 */
export function coberturaDoOrcamento(preco: number, orcamento: number): number {
  if (orcamento >= preco) return 100;
  return Math.floor((orcamento / preco) * 100);
}

/**
 * Nota de orçamento (0 a 100) usada só para ORDENAR os carros, pelo preço "a partir de" contra o teto:
 * até o teto = 100; até 10% acima cai de 100 para 50; de 10% a 30% acima cai de 50 para 0; além disso, 0.
 */
export function notaDeOrcamento(preco: number, teto: number): number {
  const excesso = (preco - teto) / teto;
  if (excesso <= 0) return 100;
  if (excesso <= 0.1) return 100 - (excesso / 0.1) * 50;
  if (excesso <= 0.3) return 50 - ((excesso - 0.1) / 0.2) * 50;
  return 0;
}


interface ModeloAvaliado {
  /** Mesmo id usado em /modelos — é o que vira favorito/comparação lá. */
  id: string;
  nome: string;
  precoDe: number;
  /** Rótulo curto do segmento, o mesmo do /modelos ("SUV médio"). */
  segmento: string;
  /** Tipo de motor: define qual energia entra no custo mensal de uso (ver shared/rodagem.ts). */
  motor: TipoMotor;
  /** 'cidade' | 'estrada' | 'offroad' | 'trabalho' — combina com o campo "Uso principal". */
  tags: string[];
  espacoBom: boolean;
  confortoBom: boolean;
  consumoBom: boolean;
  potenciaBoa: boolean;
}

/** Mesma linha e mesmos ids do /modelos, com sinalizadores usados só pra pontuar a prévia do perfil. */
const CATALOGO_PERFIL: ModeloAvaliado[] = [
  { id: 'territory', nome: 'Territory', segmento: 'SUV médio', precoDe: 219900, motor: 'combustao', tags: ['cidade', 'estrada'], espacoBom: true, confortoBom: true, consumoBom: false, potenciaBoa: false },
  { id: 'bronco-sport', nome: 'Bronco Sport', segmento: 'SUV compacto', precoDe: 249900, motor: 'combustao', tags: ['offroad', 'cidade'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: false },
  { id: 'explorer', nome: 'Explorer', segmento: 'SUV grande', precoDe: 429900, motor: 'combustao', tags: ['estrada', 'cidade'], espacoBom: true, confortoBom: true, consumoBom: false, potenciaBoa: false },
  { id: 'f-150', nome: 'F-150', segmento: 'Picape grande', precoDe: 439900, motor: 'combustao', tags: ['trabalho', 'offroad'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: true },
  { id: 'ranger', nome: 'Ranger', segmento: 'Picape média', precoDe: 259900, motor: 'diesel', tags: ['trabalho', 'offroad'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: false },
  { id: 'ranger-raptor', nome: 'Ranger Raptor', segmento: 'Picape de performance', precoDe: 399900, motor: 'combustao', tags: ['offroad', 'trabalho'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: true },
  { id: 'maverick-hybrid', nome: 'Maverick Hybrid', segmento: 'Picape compacta', precoDe: 219900, motor: 'hibrido', tags: ['cidade', 'trabalho'], espacoBom: false, confortoBom: true, consumoBom: true, potenciaBoa: false },
  { id: 'maverick-tremor', nome: 'Maverick Tremor', segmento: 'Picape compacta off-road', precoDe: 249900, motor: 'combustao', tags: ['offroad'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: false },
  { id: 'mustang-gt', nome: 'Mustang GT', segmento: 'Esportivo', precoDe: 549900, motor: 'combustao', tags: ['estrada'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: true },
  { id: 'mustang-mach-e', nome: 'Mustang Mach-E', segmento: 'SUV elétrico', precoDe: 379900, motor: 'eletrico', tags: ['cidade', 'estrada'], espacoBom: true, confortoBom: true, consumoBom: true, potenciaBoa: false },
  { id: 'f-150-lightning', nome: 'F-150 Lightning', segmento: 'Picape elétrica', precoDe: 599900, motor: 'eletrico', tags: ['trabalho'], espacoBom: false, confortoBom: false, consumoBom: true, potenciaBoa: true },
  { id: 'transit-furgao', nome: 'Transit Furgão', segmento: 'Van de carga', precoDe: 219900, motor: 'diesel', tags: ['trabalho'], espacoBom: false, confortoBom: false, consumoBom: false, potenciaBoa: false },
  { id: 'transit-minibus', nome: 'Transit Minibus', segmento: 'Van de passageiros', precoDe: 239900, motor: 'diesel', tags: ['trabalho', 'estrada'], espacoBom: true, confortoBom: false, consumoBom: false, potenciaBoa: false },
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
  private authService = inject(AuthService);

  private readonly chavePerfilSalvo = 'seia-perfil-salvo';
  private readonly chaveConsentimento = 'seia-consentimento-concessionaria';

  constructor() {
    this.carregarConsentimento();
    this.carregarSalvo();
    this.usoOriginal = structuredClone(this.uso);
    this.contaOriginal = structuredClone(this.conta);
    this.sincronizarComModelos();

    // O e-mail vem da sessão de login, não do que ficou salvo no navegador.
    this.authService.getCurrentUserEmail().subscribe({
      next: (email) => {
        if (!email) return;
        this.conta.email = email;
        this.contaOriginal.email = email;
      },
      error: () => {},
    });
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

  private carregarConsentimento(): void {
    try {
      this.compartilhaComConcessionaria = localStorage.getItem(this.chaveConsentimento) === '1';
    } catch {
      // localStorage indisponível — começa desligado.
    }
  }

  salvarConsentimento(ligado: boolean): void {
    try {
      localStorage.setItem(this.chaveConsentimento, ligado ? '1' : '0');
    } catch {
      // localStorage indisponível — a escolha vale só para esta sessão.
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
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    void this.authService.logout();
  }


  readonly opcoesUso = ['Cidade', 'Estrada', 'Off-road', 'Trabalho'];
  readonly opcoesPassageiros = ['1 ou 2', '3 ou 4', '5 ou mais'];
  readonly opcoesPrioridade = ['Consumo', 'Espaço', 'Conforto', 'Potência'];
  readonly maxPrioridades = 2;

  uso: PerfilUso = {
    uso: 'Cidade',
    passageiros: '3 ou 4',
    rodagem: '',
    orcamento: '',
    prioridades: ['Consumo', 'Espaço'],
  };

  conta: DadosConta = {
    nome: '',
    telefone: '',
    email: '',
    criadaEm: '',
  };

  /** Ranking completo (14 modelos) recalculado a cada ajuste no perfil de uso — não espera "Salvar". */
  private calcularRanking(): { id: string; modelo: string; segmento: string; combinaComUso: boolean; cobertura: number | null; falta: number; uso: AvaliacaoUso }[] {
    const orcamento = this.orcamentoNumero();
    const tagDeUso = TAG_POR_USO[this.uso.uso];
    // Custo mensal de uso de TODOS os carros: a nota de cada um depende do menor custo entre eles.
    const usos = avaliarUso(CATALOGO_PERFIL.map((m) => ({ id: m.id, tipo: m.motor })), this.rodagemNumero());

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

      const notaDeUso = Math.max(15, Math.min(97, Math.round(nota)));

      // Ordem: a MENOR entre as notas disponíveis (uso, orçamento e rodagem). Nenhuma nota "sobe" a outra: um carro
      // acima do teto ou caro de rodar nunca ganha posição só por combinar com o uso.
      const uso = usos[m.id];
      let ordem = notaDeUso;
      if (orcamento) ordem = Math.min(ordem, notaDeOrcamento(m.precoDe, orcamento));
      if (uso.estado === 'ok') ordem = Math.min(ordem, uso.nota);

      // O que aparece é quanto do preço o orçamento cobre — sem orçamento informado não há porcentagem.
      const cobertura = orcamento ? coberturaDoOrcamento(m.precoDe, orcamento) : null;
      const falta = orcamento && orcamento < m.precoDe ? m.precoDe - orcamento : 0;

      return { id: m.id, modelo: m.nome, segmento: m.segmento, combinaComUso, cobertura, falta, uso, ordem: Math.floor(ordem), precoDe: m.precoDe };
    });

    // Empate na ordem (comum quando o teto é irreal e tudo cai a 0): sobe o mais barato, o que mais chega perto do teto.
    pontuados.sort((a, b) => b.ordem - a.ordem || a.precoDe - b.precoDe);
    return pontuados.map(({ ordem, precoDe, ...resto }) => resto);
  }

  get previa(): Previa {
    const [primeiro, ...resto] = this.calcularRanking();
    const item = (r: ItemPrevia): ItemPrevia => ({ modelo: r.modelo, cobertura: r.cobertura, falta: r.falta, uso: r.uso });
    return { ...item(primeiro), outros: resto.slice(0, 2).map(item) };
  }

  /** Há custo de uso estimado em algum dos três carros da prévia — aí vale o aviso de que são estimativas. */
  get haEstimativaDeUso(): boolean {
    const p = this.previa;
    return [p, ...p.outros].some((c) => c.uso.estado === 'ok');
  }

  /** Valor em reais no formato brasileiro, ex.: "R$ 30.100". */
  real(valor: number): string {
    return 'R$ ' + Math.round(valor).toLocaleString('pt-BR');
  }

  /** Foto do modelo mais compatível (ou null quando não há foto dele). */
  get fotoPrevia(): string | null {
    return fotoDoModelo(this.previa.modelo);
  }

  /** Ícone de pessoa, mostrado no avatar enquanto não há nome nem e-mail para tirar as iniciais. */
  readonly iconePerfil = ICONES['perfil'];

  private rodagemNumero(): number | null {
    const digitos = this.uso.rodagem.replace(/\D/g, '');
    return digitos ? Number(digitos) : null;
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
    if (chave === 'favoritos') {
      this.router.navigate(['/modelos'], { queryParams: { favoritos: '1' } });
    } else if (chave === 'comparacoes') {
      this.router.navigate(['/modelos'], { queryParams: { ultimaComparacao: '1' } });
    }
  }

  compartilhaComConcessionaria = false;

  private usoOriginal: PerfilUso = structuredClone(this.uso);
  private contaOriginal: DadosConta = structuredClone(this.conta);

  get iniciais(): string {
    const iniciais = this.conta.nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
    // Sem nome ainda (conta nova ou carregando): usa a primeira letra do e-mail em vez de um quadrado vazio
    return iniciais || (this.conta.email?.[0]?.toUpperCase() ?? '');
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

  /** Rodagem e orçamento só aceitam dígitos: letras e símbolos (inclusive colados) são descartados na hora. */
  aoDigitarUso(campo: 'rodagem' | 'orcamento', evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const limpo = input.value.replace(/\D/g, '');
    if (input.value !== limpo) input.value = limpo;
    this.uso[campo] = limpo;
    this.sincronizarComModelos();
  }

  /** Telefone só aceita dígitos (até 11) e aparece no formato (00) 00000-0000, ou (00) 0000-0000 quando fixo. */
  aoDigitarTelefone(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const d = input.value.replace(/\D/g, '').slice(0, 11);
    let mascarado = d;
    if (d.length > 10) mascarado = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    else if (d.length > 6) mascarado = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    else if (d.length > 2) mascarado = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    else if (d.length > 0) mascarado = `(${d}`;
    if (input.value !== mascarado) input.value = mascarado;
    this.conta.telefone = mascarado;
  }

  prioritario(v: string): boolean {
    return this.uso.prioridades.includes(v);
  }

  descartar(): void {
    this.uso = structuredClone(this.usoOriginal);
    this.conta = structuredClone(this.contaOriginal);
  }

  /** Telefone é opcional, mas se for preenchido tem de estar completo: 10 (fixo) ou 11 dígitos (celular). */
  get telefoneIncompleto(): boolean {
    const digitos = this.conta.telefone.replace(/\D/g, '').length;
    return digitos > 0 && digitos < 10;
  }

  salvar(): void {
    if (!this.alteracoes || this.telefoneIncompleto) return;
    this.usoOriginal = structuredClone(this.uso);
    this.contaOriginal = structuredClone(this.conta);
    this.persistir();

    // O carro em primeiro lugar já vai para o passo "Qual modelo?" do /agendamentos.
    const [primeiro] = this.calcularRanking();
    salvarModeloRecomendado({ nome: primeiro.modelo, segmento: primeiro.segmento, cobertura: primeiro.cobertura });
  }
}