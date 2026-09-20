import { Component, ElementRef, computed, effect, inject, signal, viewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Car } from '../../ford-api.service';
import { FONTE_VEICULOS } from '../../shared/fonte-veiculos';
import { AVISO_BASE_MERCADO, MERCADO_POR_MODELO } from '../../shared/mercado-modelos';
import {
  EIXOS, Eixo, FatoLido, MatchVeiculo, PerfilCliente,
  fatosDoPerfil, formatarReais, interpretarPerfil, narrativaExecutiva, pesosDoPerfil, ranquear,
} from '../../shared/agente-perfil';
import { RevealDirective } from '../../shared/reveal.directive';

Chart.register(...registerables);

/**
 * Paleta dos gráficos. Três slots categóricos validados para daltonismo
 * (protanopia/deuteranopia, ΔE ≥ 8 em todos os pares) sobre fundo branco.
 * O slot 3 fica abaixo de 3:1 de contraste, por isso todo gráfico que o usa
 * traz legenda e a tabela de dados — nunca cor sozinha carregando significado.
 */
const SERIE = ['#2a78d6', '#eb6834', '#1baf7a'];
const TINTA_PRIMARIA = '#001730';
const TINTA_SECUNDARIA = '#55677A';
const TINTA_SUAVE = '#7C8A99';
const GRADE = '#E7EDF3';
const SUPERFICIE = '#ffffff';

/** Desenha o valor na ponta da barra — rótulo direto, em tinta de texto, nunca na cor da série. */
const rotuloNaPonta = {
  id: 'rotuloNaPonta',
  afterDatasetsDraw(chart: Chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = '600 12px "IBM Plex Sans", system-ui, sans-serif';
    ctx.fillStyle = TINTA_SECUNDARIA;
    ctx.textBaseline = 'middle';

    for (const dataset of chart.data.datasets) {
      const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
      if (meta.hidden) continue;

      meta.data.forEach((barra, i) => {
        const valor = dataset.data[i] as number | null;
        if (valor === null || valor === undefined) return;
        const sufixo = (dataset as { sufixo?: string }).sufixo ?? '';
        ctx.textAlign = 'left';
        ctx.fillText(`${valor.toLocaleString('pt-BR')}${sufixo}`, barra.x + 8, barra.y);
      });
    }
    ctx.restore();
  },
};

interface Metrica {
  chave: string;
  rotulo: string;
  unidade: string;
  ler: (c: Car) => number | null;
}

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
 * Lê a potência publicada pela API. O campo estruturado às vezes vem nulo, mas o
 * cavalo está escrito no nome da variante — "(571 HP)". Ler dali continua sendo
 * dado real da API; o que não existe fica nulo e some do gráfico, sem estimativa.
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
  private fonte = inject(FONTE_VEICULOS);
  private router = inject(Router);

  readonly avisoMercado = AVISO_BASE_MERCADO;
  readonly nomeFonte = this.fonte.nome;
  readonly eixos = EIXOS;
  readonly cores = SERIE;
  readonly formatarReais = formatarReais;

  descricao = '';

  readonly personas: Persona[] = [
    { rotulo: 'Jovem urbano', texto: 'Cliente solteiro, 20 anos, sem filhos, residente em cidade grande.' },
    { rotulo: 'Família em formação', texto: 'Casal casado, 38 anos, 2 filhos pequenos, mora na capital e viaja de carro nas férias.' },
    { rotulo: 'Produtor rural', texto: 'Cliente casado, 45 anos, 3 filhos, mora no interior, usa o carro para trabalho e carga em estrada de terra.' },
    { rotulo: 'Frota corporativa', texto: 'Gestor de frota, 42 anos, obra urbana, precisa de carga e tem meta de emissão. Orçamento até 600 mil.' },
    { rotulo: 'Alta renda sem filhos', texto: 'Cliente divorciado, 34 anos, sem filhos, capital, renda de 45 mil, gosta de performance e aventura no fim de semana.' },
  ];

  readonly metricas: Metrica[] = [
    { chave: 'potencia', rotulo: 'Potência', unidade: 'cv', ler: potenciaPublicada },
    { chave: 'comprimento', rotulo: 'Comprimento', unidade: 'mm', ler: (c) => c.lengthMm },
    { chave: 'altura', rotulo: 'Altura', unidade: 'mm', ler: (c) => c.heightMm },
    { chave: 'tanque', rotulo: 'Tanque', unidade: 'L', ler: (c) => c.fuelTankLitres },
  ];

  // ---- Estado da análise --------------------------------------------------
  perfil = signal<PerfilCliente | null>(null);
  fatos = signal<FatoLido[]>([]);
  matches = signal<MatchVeiculo[]>([]);
  pesos = signal<Record<Eixo, number> | null>(null);
  metricaAtiva = signal<string>('potencia');
  mostrarTabela = signal<boolean>(false);
  mostrarPesos = signal<boolean>(false);

  // ---- Estado da fonte de dados -------------------------------------------
  carregandoApi = signal<boolean>(false);
  erroApi = signal<string | null>(null);
  fichas = signal<LinhaFicha[]>([]);

  readonly lider = computed(() => this.matches()[0] ?? null);
  readonly podio = computed(() => this.matches().slice(0, 3));
  readonly demais = computed(() => this.matches().slice(3));
  readonly analisou = computed(() => this.perfil() !== null);

  /**
   * Nenhum modelo da linha cabe no teto. Acontece bastante com cliente jovem, já que
   * o modelo de entrada custa mais que o orçamento típico da faixa — e é um achado
   * de negócio, não um erro: o ranking passa a mostrar o mais próximo do alcance.
   */
  readonly nenhumCabe = computed(
    () => this.matches().length > 0 && this.matches().every((m) => !m.dentroDoOrcamento),
  );

  readonly narrativa = computed(() => {
    const l = this.lider();
    const p = this.perfil();
    return l && p ? narrativaExecutiva(l, p) : '';
  });

  readonly driversLider = computed(() => {
    const l = this.lider();
    return l ? MERCADO_POR_MODELO.get(l.modelo)?.drivers ?? [] : [];
  });

  readonly metricaSelecionada = computed(
    () => this.metricas.find((m) => m.chave === this.metricaAtiva()) ?? this.metricas[0],
  );

  /** Linhas da ficha na métrica ativa, sem os modelos que a API não publicou. */
  readonly valoresMetrica = computed(() => {
    const chave = this.metricaAtiva();
    return this.fichas()
      .map((f) => ({ modelo: f.modelo, valor: f[chave as keyof LinhaFicha] as number | null }))
      .filter((v): v is { modelo: string; valor: number } => v.valor !== null);
  });

  readonly semDadoNaMetrica = computed(
    () => this.fichas().length - this.valoresMetrica().length,
  );

  // ---- Canvas dos gráficos ------------------------------------------------
  private radarCanvas = viewChild<ElementRef<HTMLCanvasElement>>('radarCanvas');
  private fichaCanvas = viewChild<ElementRef<HTMLCanvasElement>>('fichaCanvas');
  private driversCanvas = viewChild<ElementRef<HTMLCanvasElement>>('driversCanvas');

  private graficoRadar?: Chart;
  private graficoFicha?: Chart;
  private graficoDrivers?: Chart;

  constructor() {
    // Cada efeito só roda quando o canvas existe no DOM e os dados mudaram.
    effect(() => this.desenharRadar(this.radarCanvas()?.nativeElement, this.podio()));
    effect(() => this.desenharFicha(this.fichaCanvas()?.nativeElement, this.valoresMetrica(), this.metricaSelecionada()));
    effect(() => this.desenharDrivers(this.driversCanvas()?.nativeElement, this.driversLider(), this.lider()?.modelo ?? ''));
  }

  ngOnDestroy(): void {
    this.graficoRadar?.destroy();
    this.graficoFicha?.destroy();
    this.graficoDrivers?.destroy();
  }

  usarPersona(p: Persona): void {
    this.descricao = p.texto;
    this.analisar();
  }

  limpar(): void {
    this.descricao = '';
    this.perfil.set(null);
    this.matches.set([]);
    this.fichas.set([]);
    this.erroApi.set(null);
  }

  analisar(): void {
    const texto = this.descricao.trim();
    if (!texto) return;

    const perfil = interpretarPerfil(texto);
    const ranking = ranquear(perfil);

    this.perfil.set(perfil);
    this.fatos.set(fatosDoPerfil(perfil));
    this.pesos.set(pesosDoPerfil(perfil));
    this.matches.set(ranking);

    this.buscarFichas(ranking.slice(0, 3).map((m) => m.modelo));
  }

  /** Puxa a ficha técnica real dos três finalistas na fonte configurada. */
  private buscarFichas(modelos: string[]): void {
    this.carregandoApi.set(true);
    this.erroApi.set(null);
    this.fichas.set([]);

    const buscas = modelos.map((nome) =>
      this.fonte.buscarPorModelo(nome, 8).pipe(
        map((itens) => this.melhorVariante(nome, itens)),
        catchError(() => of(null)),
      ),
    );

    forkJoin(buscas).subscribe({
      next: (linhas) => {
        this.carregandoApi.set(false);
        const validas = linhas.filter((l): l is LinhaFicha => l !== null);
        this.fichas.set(validas);
        if (validas.length === 0) {
          this.erroApi.set('A fonte de dados não respondeu. O ranking e os textos continuam válidos; só a ficha técnica ficou de fora.');
        }
      },
      error: () => {
        this.carregandoApi.set(false);
        this.erroApi.set('A fonte de dados não respondeu. O ranking e os textos continuam válidos; só a ficha técnica ficou de fora.');
      },
    });
  }

  /**
   * Escolhe a variante que representa o modelo no gráfico e na tabela.
   *
   * O critério é ficha mais completa primeiro, potência só como desempate. Ordenar
   * por potência sozinha escolhia variantes que a Ford publica pela metade — o
   * Mach-E mais potente vem sem comprimento nem tanque e sumia do gráfico.
   */
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

  async copiarNarrativa(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.narrativa());
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    } catch {
      this.copiado.set(false);
    }
  }
  copiado = signal<boolean>(false);

  rotuloEixo(e: Eixo): string {
    return EIXOS.find((x) => x.chave === e)?.rotulo ?? e;
  }

  // ---- Gráficos -----------------------------------------------------------

  /** Radar: aderência dos finalistas nos seis eixos. Mesma escala 0–100 em todos. */
  private desenharRadar(canvas: HTMLCanvasElement | undefined, podio: MatchVeiculo[]): void {
    this.graficoRadar?.destroy();
    if (!canvas || podio.length === 0) return;

    const config: ChartConfiguration<'radar'> = {
      type: 'radar',
      data: {
        labels: EIXOS.map((e) => e.rotulo),
        datasets: podio.map((m, i) => ({
          label: m.modelo,
          data: EIXOS.map((e) => m.perfil[e.chave]),
          borderColor: SERIE[i],
          backgroundColor: `${SERIE[i]}1A`, // fill em ~10%: um véu, nunca um bloco
          borderWidth: 2,
          pointBackgroundColor: SERIE[i],
          pointBorderColor: SUPERFICIE,
          pointBorderWidth: 2, // anel na cor da superfície, pra o ponto sobreviver ao cruzamento
          pointRadius: 4,
          pointHoverRadius: 6,
        })),
      },
      options: {
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
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.r}/100` },
          },
        },
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { stepSize: 25, color: TINTA_SUAVE, backdropColor: 'transparent', font: { size: 10.5 } },
            grid: { color: GRADE },
            angleLines: { color: GRADE },
            pointLabels: { color: TINTA_SECUNDARIA, font: { size: 12, weight: 600 } },
          },
        },
      },
    };

    this.graficoRadar = new Chart(canvas, config);
  }

  /** Barra horizontal: uma métrica só, dado real da API, série única sem legenda. */
  private desenharFicha(
    canvas: HTMLCanvasElement | undefined,
    valores: { modelo: string; valor: number }[],
    metrica: Metrica,
  ): void {
    this.graficoFicha?.destroy();
    if (!canvas || valores.length === 0) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: valores.map((v) => v.modelo),
        datasets: [{
          label: `${metrica.rotulo} (${metrica.unidade})`,
          data: valores.map((v) => v.valor),
          backgroundColor: SERIE[0],
          borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
          maxBarThickness: 24,
          sufixo: ` ${metrica.unidade}`,
        } as ChartConfiguration<'bar'>['data']['datasets'][number] & { sufixo: string }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 650, easing: 'easeOutCubic' },
        layout: { padding: { right: 72 } }, // espaço pro rótulo na ponta não ser cortado
        plugins: {
          legend: { display: false }, // série única: o título do card já diz o que está plotado
          tooltip: {
            backgroundColor: TINTA_PRIMARIA,
            padding: 10,
            callbacks: { label: (ctx) => ` ${(ctx.parsed.x ?? 0).toLocaleString('pt-BR')} ${metrica.unidade}` },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: GRADE },
            border: { display: false },
            ticks: { color: TINTA_SUAVE, font: { size: 11 } },
          },
          y: {
            grid: { display: false },
            border: { color: GRADE },
            ticks: { color: TINTA_SECUNDARIA, font: { size: 12.5, weight: 600 } },
          },
        },
      },
      plugins: [rotuloNaPonta],
    };

    this.graficoFicha = new Chart(canvas, config);
  }

  /** Barra horizontal: fatores que a massa de compradores cita. Série única. */
  private desenharDrivers(
    canvas: HTMLCanvasElement | undefined,
    drivers: { fator: string; peso: number }[],
    modelo: string,
  ): void {
    this.graficoDrivers?.destroy();
    if (!canvas || drivers.length === 0) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: drivers.map((d) => d.fator),
        datasets: [{
          label: `Compradores do ${modelo} que citam o fator`,
          data: drivers.map((d) => d.peso),
          backgroundColor: SERIE[0],
          borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
          maxBarThickness: 20,
          sufixo: '%',
        } as ChartConfiguration<'bar'>['data']['datasets'][number] & { sufixo: string }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 650, easing: 'easeOutCubic' },
        layout: { padding: { right: 56 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: TINTA_PRIMARIA,
            padding: 10,
            callbacks: { label: (ctx) => ` ${ctx.parsed.x}% citam como decisivo` },
          },
        },
        scales: {
          x: {
            beginAtZero: true, max: 100,
            grid: { color: GRADE },
            border: { display: false },
            ticks: { color: TINTA_SUAVE, font: { size: 11 }, callback: (v) => `${v}%` },
          },
          y: {
            grid: { display: false },
            border: { color: GRADE },
            ticks: { color: TINTA_SECUNDARIA, font: { size: 12 } },
          },
        },
      },
      plugins: [rotuloNaPonta],
    };

    this.graficoDrivers = new Chart(canvas, config);
  }
}
