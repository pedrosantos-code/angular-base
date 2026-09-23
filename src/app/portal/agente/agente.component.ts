import { Component, ElementRef, computed, effect, inject, signal, viewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Car } from '../../ford-api.service';
import { FONTE_VEICULOS } from '../../shared/fonte-veiculos';
import { FONTE_AFINIDADE } from '../../shared/fonte-afinidade';
import {
  ApiPessoasError, GrupoLift, ModeloDetalhe, MunicipioApi, PerfilApi,
} from '../../shared/api-pessoas.service';
import {
  MatchModelo, combinarRankings, formatarPct, liftEmPercentual,
  ordenarPorLift, rotuloLocalidade, sobreIndexa,
} from '../../shared/afinidade-modelos';
import {
  COMO_LER, LeituraEfeito, diferencaConfiavel, diferencaCurta, diferencaLegivel,
  frequenciaLegivel, leituraDoEfeito, resumoExecutivo, rotuloGrupo, rotuloGrupoCurto,
} from '../../shared/linguagem-executiva';
import {
  Area, Escolaridade, FatoLido, Genero, IDADE_MINIMA, PerfilDemografico,
  ROTULO_AREA, ROTULO_ESCOLARIDADE,
  consultaDoPerfil, fatosDoPerfil, faltasDoPerfil, interpretarPerfil,
} from '../../shared/perfil-demografico';
import { RevealDirective } from '../../shared/reveal.directive';
import { AnaliseIaError, AnaliseIaService, Insights } from '../../shared/analise-ia.service';

Chart.register(...registerables);

/**
 * Paleta dos gráficos. Slots categóricos 1 e 2 para as duas séries de share, e o
 * par divergente azul↔vermelho para o lift, que tem polaridade (acima ou abaixo
 * da média local). Validado com o script do guia de dataviz contra a superfície
 * branca do painel: todos os checks passam, inclusive separação para daltonismo.
 */
const SERIE = ['#2a78d6', '#eb6834'];
const ACIMA = '#2a78d6';
const ABAIXO = '#e34948';
const TINTA_PRIMARIA = '#001730';
const TINTA_SECUNDARIA = '#55677A';
const TINTA_SUAVE = '#7C8A99';
const GRADE = '#E7EDF3';
const SUPERFICIE = '#ffffff';

/**
 * Desenha o valor na ponta da barra — rótulo direto, em tinta de texto.
 *
 * Fora da barra por padrão, e dentro dela quando não couber: numa barra longa de
 * gráfico divergente o rótulo externo passava por cima dos nomes do eixo
 * ("H 20-29" ficava ilegível atrás de "−24,9%"). Dentro, o texto vai em branco
 * sobre o preenchimento, que é contraste suficiente nas duas cores da série.
 */
const rotuloNaPonta = {
  id: 'rotuloNaPonta',
  afterDatasetsDraw(chart: Chart) {
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.font = '600 12px "IBM Plex Sans", system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    for (const dataset of chart.data.datasets) {
      const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
      if (meta.hidden) continue;

      meta.data.forEach((barra, i) => {
        const valor = dataset.data[i] as number | null;
        if (valor === null || valor === undefined) return;

        const sufixo = (dataset as { sufixo?: string }).sufixo ?? '';
        // Uma casa fixa: "18%" ao lado de "9,1%" faz o olho comparar grandezas diferentes.
        const texto = `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${sufixo}`;
        const largura = ctx.measureText(texto).width;
        const negativo = valor < 0;
        const folga = 8;

        // Onde existe bigode de intervalo, a âncora é a ponta dele: ancorar na
        // barra faz o número pousar sobre a linha do IC e os dois somem juntos.
        const ic = (dataset as { ic?: [number, number][] }).ic?.[i];
        let ponta = barra.x;
        if (ic) {
          const escalaX = chart.scales['x'];
          const extremos = [barra.x, escalaX.getPixelForValue(ic[0]), escalaX.getPixelForValue(ic[1])];
          ponta = negativo ? Math.min(...extremos) : Math.max(...extremos);
        }

        const cabeFora = negativo
          ? ponta - folga - largura >= chartArea.left
          : ponta + folga + largura <= chartArea.right;

        // Fora da barra o rótulo segue o sentido dela; dentro, volta na direção do zero.
        const paraEsquerda = cabeFora ? negativo : !negativo;
        const x = cabeFora ? ponta : barra.x;

        ctx.fillStyle = cabeFora ? TINTA_SECUNDARIA : SUPERFICIE;
        ctx.textAlign = paraEsquerda ? 'right' : 'left';
        ctx.fillText(texto, x + (paraEsquerda ? -folga : folga), barra.y);
      });
    }
    ctx.restore();
  },
};

/**
 * Bigodes de intervalo de confiança.
 *
 * A API publica IC90 em todo efeito e em todo lift por grupo, e omitir isso seria
 * apresentar estimativa como medida exata — num painel que vai para reunião, é a
 * diferença entre "o efeito existe" e "o efeito pode ser zero". O dataset carrega
 * `ic` com o par [mínimo, máximo] na mesma unidade do valor plotado.
 */
const barrasDeErro = {
  id: 'barrasDeErro',
  afterDatasetsDraw(chart: Chart) {
    const { ctx } = chart;
    const escalaX = chart.scales['x'];

    for (const dataset of chart.data.datasets) {
      const ic = (dataset as { ic?: [number, number][] }).ic;
      if (!ic) continue;

      const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
      if (meta.hidden) continue;

      ctx.save();
      ctx.strokeStyle = TINTA_SECUNDARIA;
      ctx.lineWidth = 1.5;

      meta.data.forEach((barra, i) => {
        const faixa = ic[i];
        if (!faixa) return;
        const x1 = escalaX.getPixelForValue(faixa[0]);
        const x2 = escalaX.getPixelForValue(faixa[1]);
        const y = barra.y;
        const meiaAltura = 4;

        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.moveTo(x1, y - meiaAltura);
        ctx.lineTo(x1, y + meiaAltura);
        ctx.moveTo(x2, y - meiaAltura);
        ctx.lineTo(x2, y + meiaAltura);
        ctx.stroke();
      });

      ctx.restore();
    }
  },
};

interface Persona {
  rotulo: string;
  texto: string;
}

interface LinhaFicha {
  modelo: string;
  variante: string;
  potencia: number | null;
  comprimento: number | null;
  altura: number | null;
  tanque: number | null;
  combustivel: string;
}

/**
 * Lê a potência publicada pela API de veículos. O campo estruturado às vezes vem
 * nulo, mas o cavalo está escrito no nome da variante — "(571 HP)". Ler dali
 * continua sendo dado real; o que não existe fica nulo, sem estimativa.
 */
function potenciaPublicada(c: Car): number | null {
  if (c.enginePowerBhp) return Math.round(c.enginePowerBhp);
  const noNome = `${c.variant ?? ''}`.match(/\((\d+(?:\.\d+)?)\s*HP\)/i);
  return noNome ? Math.round(parseFloat(noNome[1])) : null;
}

@Component({
  selector: 'seia-agente',
  standalone: true,
  imports: [CommonModule, FormsModule, RevealDirective],
  templateUrl: './agente.component.html',
  styleUrl: './agente.component.css',
})
export class AgenteComponent implements OnDestroy {
  private fonte = inject(FONTE_AFINIDADE);
  private fonteVeiculos = inject(FONTE_VEICULOS);
  private router = inject(Router);
  private ia = inject(AnaliseIaService);

  readonly nomeFonte = this.fonte.nome;
  readonly nomeFonteVeiculos = this.fonteVeiculos.nome;
  readonly idadeMinima = IDADE_MINIMA;
  readonly rotuloEscolaridade = ROTULO_ESCOLARIDADE;
  readonly rotuloArea = ROTULO_AREA;
  readonly formatarPct = formatarPct;
  readonly sobreIndexa = sobreIndexa;

  // Tradutores para a superfície executiva. O número técnico continua no painel,
  // atrás de "ver detalhe técnico" — o jargão sai da frente, a evidência fica.
  readonly frequenciaLegivel = frequenciaLegivel;
  readonly diferencaLegivel = diferencaLegivel;
  readonly diferencaCurta = diferencaCurta;
  readonly rotuloGrupo = rotuloGrupo;
  readonly comoLer = COMO_LER;

  readonly escolaridades: Escolaridade[] = ['fundamental_incompleto', 'fundamental', 'medio', 'superior'];
  readonly areas: Area[] = ['urbana', 'rural'];

  descricao = '';

  /**
   * Personas ajustadas à base nova: a API cobre o estado de São Paulo e pede
   * idade (mínimo 20) e gênero. As frases citam município real da base.
   */
  readonly personas: Persona[] = [
    { rotulo: 'Jovem urbano', texto: 'Homem de 24 anos, solteiro, ensino superior, mora em Campinas, renda per capita de 3 salários mínimos.' },
    { rotulo: 'Família na capital', texto: 'Mulher de 38 anos, casada, ensino médio, mora em São Paulo, renda per capita de 1,5 salário mínimo, área urbana.' },
    { rotulo: 'Interior rural', texto: 'Homem de 45 anos, casado, ensino fundamental, mora em Andradina, zona rural, renda per capita de 1 salário mínimo.' },
    { rotulo: 'Alta renda', texto: 'Mulher de 34 anos, ensino superior, mora em Santos, renda per capita de 8 salários mínimos, área urbana.' },
    { rotulo: 'Aposentado', texto: 'Homem aposentado de 68 anos, ensino fundamental, mora em Ribeirão Preto, renda per capita de 2 salários mínimos.' },
  ];

  // ---- Formulário ---------------------------------------------------------

  /**
   * Rascunho editável do perfil. O texto livre preenche o que consegue; os campos
   * ficam à mão porque a API aceita recortes que o texto raramente traz (região,
   * renda per capita em salários mínimos) e porque gênero e idade são obrigatórios.
   */
  rascunho = signal<PerfilDemografico>(interpretarPerfil(''));

  atualizar<K extends keyof PerfilDemografico>(campo: K, valor: PerfilDemografico[K]): void {
    this.rascunho.update((p) => ({ ...p, [campo]: valor }));
  }

  definirGenero(g: Genero): void {
    this.rascunho.update((p) => ({ ...p, genero: g, generoExplicito: true }));
  }

  /** Lê o texto livre e joga o resultado nos campos, sem consultar a API ainda. */
  lerDescricao(): void {
    const texto = this.descricao.trim();
    if (!texto) return;
    this.rascunho.set(interpretarPerfil(texto));
    this.sugestoesMunicipio.set([]);
  }

  readonly faltas = computed(() => faltasDoPerfil(this.rascunho()));
  readonly podeAnalisar = computed(() => this.faltas().length === 0 && !this.carregando());

  // ---- Autocomplete de município -----------------------------------------

  buscaMunicipio = '';
  sugestoesMunicipio = signal<MunicipioApi[]>([]);
  buscandoMunicipio = signal<boolean>(false);

  async buscarMunicipios(): Promise<void> {
    const q = this.buscaMunicipio.trim();
    if (q.length < 3) {
      this.sugestoesMunicipio.set([]);
      return;
    }

    this.buscandoMunicipio.set(true);
    try {
      this.sugestoesMunicipio.set(await this.fonte.municipios(q));
    } catch {
      this.sugestoesMunicipio.set([]);
    } finally {
      this.buscandoMunicipio.set(false);
    }
  }

  escolherMunicipio(m: MunicipioApi): void {
    this.rascunho.update((p) => ({ ...p, municipio: m.municipio, regiao: null }));
    this.buscaMunicipio = '';
    this.sugestoesMunicipio.set([]);
  }

  limparMunicipio(): void {
    this.rascunho.update((p) => ({ ...p, municipio: null }));
  }

  // ---- Estado da análise --------------------------------------------------

  perfilAnalisado = signal<PerfilDemografico | null>(null);
  perfilDaApi = signal<PerfilApi | null>(null);
  fatos = signal<FatoLido[]>([]);
  matches = signal<MatchModelo[]>([]);
  avisoApi = signal<string>('');
  avisoCosseno = signal<string>('');
  detalheLider = signal<ModeloDetalhe | null>(null);

  carregando = signal<boolean>(false);
  erro = signal<string | null>(null);
  /** Preenchido quando o cosseno falha mas a regressão respondeu: painel parcial. */
  avisoParcial = signal<string | null>(null);

  mostrarTabela = signal<boolean>(false);

  readonly analisou = computed(() => this.matches().length > 0);
  readonly lider = computed(() => this.matches()[0] ?? null);
  readonly porLift = computed(() => ordenarPorLift(this.matches()));
  readonly maisCaracteristico = computed(() => this.porLift()[0] ?? null);

  /** Top 8 para os gráficos: acima disso a barra fica fina e o rótulo colide. */
  readonly paraGrafico = computed(() => this.matches().slice(0, 8));

  readonly localidade = computed(() => {
    const p = this.perfilDaApi();
    return p ? rotuloLocalidade(p) : '';
  });

  readonly ajustesContexto = computed(() => this.perfilDaApi()?.ajustes_de_contexto ?? []);

  /** Frases que explicam onde o modelo aparece, já sem jargão estatístico. */
  readonly leiturasDoLider = computed<LeituraEfeito[]>(
    () => this.detalheLider()?.efeitos_contexto.map(leituraDoEfeito) ?? [],
  );

  readonly explicacoes = computed(() => this.leiturasDoLider().filter((l) => l.conclusivo));
  readonly semEvidencia = computed(() => this.leiturasDoLider().filter((l) => !l.conclusivo));

  readonly narrativa = computed(() => {
    const l = this.lider();
    const p = this.perfilDaApi();
    if (!l || !p) return '';
    return resumoExecutivo({
      localidade: rotuloLocalidade(p),
      grupo: p.grupo,
      lider: l,
      maiorPreferencia: this.maisCaracteristico(),
      leituras: this.leiturasDoLider(),
    });
  });

  /** Detalhe técnico fica recolhido: quem audita abre, quem apresenta não vê. */
  mostrarTecnico = signal<boolean>(false);

  // ---- Ficha técnica (fonte secundária) -----------------------------------

  carregandoFicha = signal<boolean>(false);
  fichas = signal<LinhaFicha[]>([]);

  // ---- Resumo executivo em PDF --------------------------------------------

  /**
   * Gráficos convertidos em PNG para o resumo impresso. O canvas do Chart.js não
   * sobrevive à impressão de forma confiável — o navegador redimensiona o elemento
   * e a biblioteca não redesenha antes do diálogo abrir. Congelar em imagem resolve.
   */
  imagensGraficos = signal<{ share: string; lift: string; grupos: string } | null>(null);

  geradoEm = signal<string>('');

  /**
   * PNG do gráfico, ou string vazia quando ele não pode ser capturado.
   *
   * O try/catch não é decorativo: se o canvas não tem contexto 2D — gráfico ainda
   * não desenhado, elemento oculto, canvas indisponível no ambiente — o Chart.js
   * lança em toDataURL. Sem isso, um gráfico problemático derruba o resumo inteiro:
   * a exceção sobe, window.print nunca é chamado e o analista clica no botão sem
   * nada acontecer. Melhor um PDF sem aquele gráfico do que nenhum PDF.
   */
  private capturar(grafico?: Chart): string {
    if (!grafico) return '';
    try {
      return grafico.toBase64Image('image/png', 1);
    } catch {
      return '';
    }
  }

  baixarPdf(): void {
    this.imagensGraficos.set({
      share: this.capturar(this.graficoShare),
      lift: this.capturar(this.graficoLift),
      grupos: this.capturar(this.graficoGrupos),
    });
    this.geradoEm.set(
      new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    );

    // Espera o Angular pintar a área de impressão antes de abrir o diálogo.
    setTimeout(() => window.print(), 120);
  }

  readonly linhasFichaPdf = computed(() =>
    this.fichas().map((f) => ({
      modelo: f.modelo,
      variante: f.variante,
      combustivel: f.combustivel,
      potencia: f.potencia !== null ? `${f.potencia} cv` : '—',
      comprimento: f.comprimento !== null ? `${f.comprimento} mm` : '—',
      altura: f.altura !== null ? `${f.altura} mm` : '—',
      tanque: f.tanque !== null ? `${f.tanque} L` : '—',
    })),
  );

  // ---- Canvas dos gráficos ------------------------------------------------

  private shareCanvas = viewChild<ElementRef<HTMLCanvasElement>>('shareCanvas');
  private liftCanvas = viewChild<ElementRef<HTMLCanvasElement>>('liftCanvas');
  private gruposCanvas = viewChild<ElementRef<HTMLCanvasElement>>('gruposCanvas');

  private graficoShare?: Chart;
  private graficoLift?: Chart;
  private graficoGrupos?: Chart;

  constructor() {
    effect(() => this.desenharShare(this.shareCanvas()?.nativeElement, this.paraGrafico()));
    effect(() => this.desenharLift(this.liftCanvas()?.nativeElement, this.paraGrafico()));
    effect(() => this.desenharGrupos(this.gruposCanvas()?.nativeElement, this.detalheLider()));
  }

  ngOnDestroy(): void {
    this.graficoShare?.destroy();
    this.graficoLift?.destroy();
    this.graficoGrupos?.destroy();
  }

  // ---- Ações --------------------------------------------------------------

  usarPersona(p: Persona): void {
    this.descricao = p.texto;
    this.rascunho.set(interpretarPerfil(p.texto));
    void this.analisar();
  }

  limpar(): void {
    this.descricao = '';
    this.rascunho.set(interpretarPerfil(''));
    this.perfilAnalisado.set(null);
    this.perfilDaApi.set(null);
    this.matches.set([]);
    this.detalheLider.set(null);
    this.fichas.set([]);
    this.erro.set(null);
    this.avisoParcial.set(null);
    this.sugestoesMunicipio.set([]);
    this.limparIa();
  }

  /**
   * Consulta a API e monta o painel.
   *
   * As duas chamadas de ranking são disparadas juntas porque o painel precisa das
   * duas leituras (share e característica). O cosseno é o que pode falhar sem
   * derrubar a tela: sem ele o ranking continua, só sem os fatores explicativos.
   */
  async analisar(): Promise<void> {
    const perfil = this.rascunho();
    if (faltasDoPerfil(perfil).length) return;

    this.carregando.set(true);
    this.erro.set(null);
    this.avisoParcial.set(null);
    this.limparIa();

    const consulta = consultaDoPerfil(perfil, 10);

    try {
      const [regressao, cosseno] = await Promise.all([
        this.fonte.ranking(consulta),
        this.fonte.rankingCaracteristico(consulta).catch(() => null),
      ]);

      if (!cosseno) {
        this.avisoParcial.set(
          'O método de semelhança (cosseno) não respondeu. O ranking por participação está completo; os fatores explicativos ficaram de fora.',
        );
      }

      const combinados = combinarRankings(regressao.ranking, cosseno?.ranking ?? []);

      this.perfilAnalisado.set(perfil);
      this.perfilDaApi.set(regressao.perfil);
      this.fatos.set(fatosDoPerfil(perfil));
      this.matches.set(combinados);
      this.avisoApi.set(regressao.aviso);
      this.avisoCosseno.set(cosseno?.aviso ?? '');

      const lider = combinados[0];
      if (lider) {
        void this.buscarDetalhe(lider.modelo);
        this.buscarFichas(combinados.slice(0, 3).map((m) => m.modelo));
      }
    } catch (e) {
      this.matches.set([]);
      this.erro.set(
        e instanceof ApiPessoasError ? e.message : 'Falha inesperada ao consultar a base de afinidade.',
      );
    } finally {
      this.carregando.set(false);
    }
  }

  /** Detalhe estatístico do líder: efeitos com IC90 e lift por grupo. */
  private async buscarDetalhe(modelo: string): Promise<void> {
    this.detalheLider.set(null);
    try {
      this.detalheLider.set(await this.fonte.detalheModelo(modelo));
    } catch {
      // Sem detalhe o painel perde dois gráficos, não a análise.
      this.detalheLider.set(null);
    }
  }

  /**
   * Ficha técnica na API de veículos, quando ela conhece o modelo.
   *
   * É fonte secundária e opcional de propósito: a base de afinidade é de frota
   * usada no estado de São Paulo (Gol, Palio, Uno), e a base de veículos cobre
   * outro recorte. Os modelos que existem nas duas ganham ficha; os demais
   * simplesmente não aparecem nesta tabela, sem erro na tela.
   */
  private buscarFichas(modelos: string[]): void {
    this.carregandoFicha.set(true);
    this.fichas.set([]);

    const buscas = modelos.map((nome) =>
      this.fonteVeiculos.buscarPorModelo(nome, 8).pipe(
        map((itens) => this.melhorVariante(nome, itens)),
        catchError(() => of(null)),
      ),
    );

    forkJoin(buscas).subscribe({
      next: (linhas) => {
        this.carregandoFicha.set(false);
        this.fichas.set(linhas.filter((l): l is LinhaFicha => l !== null));
      },
      error: () => {
        this.carregandoFicha.set(false);
        this.fichas.set([]);
      },
    });
  }

  /** Variante mais completa primeiro, potência só como desempate. */
  private melhorVariante(nome: string, itens: Car[]): LinhaFicha | null {
    if (!itens.length) return null;

    const completude = (c: Car) =>
      [potenciaPublicada(c), c.lengthMm, c.heightMm, c.fuelTankLitres].filter((v) => v !== null).length;

    const escolhido = [...itens].sort(
      (a, b) => completude(b) - completude(a) || (potenciaPublicada(b) ?? 0) - (potenciaPublicada(a) ?? 0),
    )[0];

    return {
      modelo: nome,
      variante: escolhido.variant ?? escolhido.model ?? '—',
      potencia: potenciaPublicada(escolhido),
      comprimento: escolhido.lengthMm,
      altura: escolhido.heightMm,
      tanque: escolhido.fuelTankLitres,
      combustivel: escolhido.engineFuelType ?? '—',
    };
  }

  verFichaTecnica(modelo: string): void {
    this.router.navigate(['/dashboard'], { queryParams: { modelo } });
  }

  copiado = signal<boolean>(false);

  async copiarNarrativa(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.narrativa());
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    } catch {
      this.copiado.set(false);
    }
  }

  // ---- Camada de IA -------------------------------------------------------

  readonly iaConfigurada = this.ia.configurada;

  insights = signal<Insights | null>(null);
  carregandoInsights = signal<boolean>(false);
  erroIa = signal<string | null>(null);

  pergunta = '';
  conversa = signal<{ pergunta: string; resposta: string }[]>([]);
  carregandoPergunta = signal<boolean>(false);

  private limparIa(): void {
    this.insights.set(null);
    this.conversa.set([]);
    this.erroIa.set(null);
    this.pergunta = '';
  }

  async gerarInsights(): Promise<void> {
    if (this.carregandoInsights()) return;
    this.carregandoInsights.set(true);
    this.erroIa.set(null);

    try {
      this.insights.set(await this.ia.gerarInsights(this.payloadParaIa()));
    } catch (e) {
      this.erroIa.set(e instanceof AnaliseIaError ? e.message : 'Falha inesperada ao consultar a IA.');
    } finally {
      this.carregandoInsights.set(false);
    }
  }

  async enviarPergunta(): Promise<void> {
    const texto = this.pergunta.trim();
    if (!texto || this.carregandoPergunta()) return;

    this.carregandoPergunta.set(true);
    this.erroIa.set(null);
    this.pergunta = '';

    try {
      const resposta = await this.ia.perguntar(this.payloadParaIa(), texto);
      this.conversa.update((c) => [...c, { pergunta: texto, resposta }]);
    } catch (e) {
      this.pergunta = texto;
      this.erroIa.set(e instanceof AnaliseIaError ? e.message : 'Falha inesperada ao consultar a IA.');
    } finally {
      this.carregandoPergunta.set(false);
    }
  }

  /**
   * O que a IA enxerga: só números que a API devolveu. Ela elabora o argumento,
   * nunca o dado. O aviso metodológico viaja junto para o modelo saber que share
   * é média de grupo no município, e não probabilidade de compra individual.
   */
  private payloadParaIa(): unknown {
    return {
      descricaoDoCliente: this.descricao.trim(),
      fatosLidos: this.fatos(),
      perfilComoApiLeu: this.perfilDaApi(),
      rankingPorParticipacao: this.matches().slice(0, 8),
      maisCaracteristico: this.maisCaracteristico(),
      detalheDoLider: this.detalheLider(),
      fichaTecnicaQuandoExiste: this.fichas(),
      fonteDeAfinidade: this.nomeFonte,
      avisoMetodologico: this.avisoApi(),
      avisoDoMetodoCosseno: this.avisoCosseno(),
    };
  }

  // ---- Gráficos -----------------------------------------------------------

  /**
   * Share do perfil vs. share do município. Duas séries da mesma medida (% da
   * frota), então cabem no mesmo eixo e a legenda é obrigatória — é o par que
   * mostra se o grupo se comporta como a praça ou se destaca dela.
   */
  private desenharShare(canvas: HTMLCanvasElement | undefined, matches: MatchModelo[]): void {
    this.graficoShare?.destroy();
    if (!canvas || matches.length === 0) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: matches.map((m) => m.modelo),
        datasets: [
          {
            label: 'Share no perfil',
            data: matches.map((m) => m.sharePerfilPct),
            backgroundColor: SERIE[0],
            borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
            maxBarThickness: 14,
          },
          {
            label: 'Share no município',
            data: matches.map((m) => m.shareMunicipioPct),
            backgroundColor: SERIE[1],
            borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
            maxBarThickness: 14,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 650, easing: 'easeOutCubic' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 16, color: TINTA_SECUNDARIA, font: { size: 12.5 } },
          },
          tooltip: {
            backgroundColor: TINTA_PRIMARIA,
            padding: 10,
            callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed.x ?? 0).toFixed(2).replace('.', ',')}%` },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: GRADE },
            border: { display: false },
            ticks: { color: TINTA_SUAVE, font: { size: 11 }, callback: (v) => `${v}%` },
          },
          y: {
            grid: { display: false },
            border: { color: GRADE },
            ticks: { color: TINTA_SECUNDARIA, font: { size: 12, weight: 600 } },
          },
        },
      },
    };

    this.graficoShare = new Chart(canvas, config);
  }

  /**
   * Lift em variação percentual sobre a média do município, com zero no meio.
   *
   * Tem polaridade, então usa o par divergente: azul acima da média, vermelho
   * abaixo. É o gráfico que responde "o que este grupo escolhe mais que a praça",
   * que o share sozinho esconde — o modelo mais popular do estado lidera o share
   * de quase todo perfil.
   */
  private desenharLift(canvas: HTMLCanvasElement | undefined, matches: MatchModelo[]): void {
    this.graficoLift?.destroy();
    if (!canvas || matches.length === 0) return;

    const ordenados = ordenarPorLift(matches);
    const variacoes = ordenados.map((m) => (m.lift - 1) * 100);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: ordenados.map((m) => m.modelo),
        datasets: [{
          label: 'Variação sobre a média do município',
          data: variacoes,
          backgroundColor: variacoes.map((v) => (v >= 0 ? ACIMA : ABAIXO)),
          borderRadius: 4,
          maxBarThickness: 18,
          sufixo: '%',
        } as ChartConfiguration<'bar'>['data']['datasets'][number] & { sufixo: string }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 650, easing: 'easeOutCubic' },
        layout: { padding: { right: 56, left: 56 } },
        plugins: {
          legend: { display: false }, // série única; a cor codifica sinal, e o rótulo na ponta repete o número
          tooltip: {
            backgroundColor: TINTA_PRIMARIA,
            padding: 10,
            callbacks: {
              label: (ctx) => {
                const m = ordenados[ctx.dataIndex];
                return ` lift ${m.lift.toFixed(2).replace('.', ',')} · ${liftEmPercentual(m.lift)} vs. média local`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: GRADE },
            border: { display: false },
            ticks: { color: TINTA_SUAVE, font: { size: 11 }, callback: (v) => `${v}%` },
          },
          y: {
            grid: { display: false },
            border: { color: GRADE },
            ticks: { color: TINTA_SECUNDARIA, font: { size: 12, weight: 600 } },
          },
        },
      },
      plugins: [rotuloNaPonta],
    };

    this.graficoLift = new Chart(canvas, config);
  }

  /**
   * Lift do líder por grupo demográfico, com IC90.
   *
   * Plota o desvio sobre a base em pontos percentuais, não o lift cru. O lift tem
   * base 1, e barra que nasce em zero mede grandeza a partir de zero: um lift 0,8
   * saía com 80% do comprimento de um lift 1,0, sugerindo "quase igual" enquanto a
   * cor dizia "abaixo da base". Com o desvio, o zero do eixo é a base e o lado da
   * barra carrega o sinal — geometria e cor passam a dizer a mesma coisa.
   */
  private desenharGrupos(canvas: HTMLCanvasElement | undefined, detalhe: ModeloDetalhe | null): void {
    this.graficoGrupos?.destroy();
    if (!canvas || !detalhe?.grupos.length) return;

    const grupos: GrupoLift[] = detalhe.grupos;
    const desvio = (v: number) => (v - 1) * 100;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: grupos.map((g) => rotuloGrupoCurto(g.grupo)),
        datasets: [{
          label: `Desvio do ${detalhe.modelo} por grupo`,
          data: grupos.map((g) => desvio(g.lift)),
          // Cinza quando a margem de erro atravessa a média: aquele grupo não
          // difere de forma confiável, e pintá-lo de azul ou vermelho afirmaria
          // uma diferença que a base não sustenta.
          backgroundColor: grupos.map((g) =>
            !diferencaConfiavel(g) ? TINTA_SUAVE : g.lift >= 1 ? ACIMA : ABAIXO,
          ),
          borderRadius: 4,
          maxBarThickness: 16,
          sufixo: '%',
          // O intervalo vai para a mesma unidade do valor, senão o bigode
          // aponta para outro lugar do eixo.
          ic: grupos.map((g) => [desvio(g.lift_ic90[0]), desvio(g.lift_ic90[1])] as [number, number]),
        } as ChartConfiguration<'bar'>['data']['datasets'][number] & { ic: [number, number][]; sufixo: string }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 650, easing: 'easeOutCubic' },
        layout: { padding: { right: 64, left: 64 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: TINTA_PRIMARIA,
            padding: 10,
            callbacks: {
              label: (ctx) => {
                const g = grupos[ctx.dataIndex];
                return ` lift ${g.lift.toFixed(3).replace('.', ',')} · IC90 ${g.lift_ic90[0].toFixed(2).replace('.', ',')} a ${g.lift_ic90[1].toFixed(2).replace('.', ',')} · mix ${g.mix_pct.toFixed(2).replace('.', ',')}%`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: GRADE },
            border: { display: false },
            ticks: { color: TINTA_SUAVE, font: { size: 11 }, callback: (v) => `${v}%` },
          },
          y: {
            grid: { display: false },
            border: { color: GRADE },
            ticks: { color: TINTA_SECUNDARIA, font: { size: 11.5, weight: 600 } },
          },
        },
      },
      plugins: [barrasDeErro, rotuloNaPonta],
    };

    this.graficoGrupos = new Chart(canvas, config);
  }

}
