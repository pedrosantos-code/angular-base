import { Component, ElementRef, ViewChild, signal, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { forkJoin, map } from 'rxjs';
import { Car, CarRecommendation, FordApiService } from '../ford-api.service';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { AuthService } from '../auth.service';
import { Comparacao, ItemComparacao, SEGMENTOS, chaveRival, modeloDaBusca, montarComparacao } from '../shared/comparacao-linha';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, TopbarComponent, RodapeComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  protected readonly title = signal('meu-projeto');

  private fordApi = inject(FordApiService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  @ViewChild('graficoCanvas') graficoCanvas?: ElementRef<HTMLCanvasElement>;
  private grafico?: Chart;

  onNavegar(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  irPerfil(): void {
    this.router.navigateByUrl('/perfil');
  }

  sair(): void {
    void this.authService.logout();
  }

  // Busca de veículo na API da Ford
  readonly sugestoes = ['Mustang', 'Ranger', 'Territory', 'Bronco Sport', 'Maverick', 'Explorer', 'F-150'];
  nomeCarro = signal<string>('');
  carregando = signal<boolean>(false);
  erroBusca = signal<string | null>(null);
  totalEncontrado = signal<number>(0);
  resultados = signal<Car[]>([]);

  // Carros semelhantes ao primeiro resultado da busca
  buscandoSemelhantes = signal<boolean>(false);
  carrosSemelhantes = signal<CarRecommendation[]>([]);

  // Comparação com concorrentes do mesmo segmento (a API tem Honda e Hyundai além da Ford)
  comparacao = signal<Comparacao | null>(null);
  /** Concorrentes do segmento (sem a Ford), com a ficha preenchida como nas versões Ford; entram no gráfico e na tabela. */
  rivais = signal<ItemComparacao[]>([]);
  /** Altura do gráfico: cresce com o número de barras para os nomes não se apertarem. */
  alturaGrafico = signal<number>(340);
  /** false enquanto os concorrentes carregam (o gráfico só mostra concorrentes, então não há o que desenhar antes). */
  graficoVisivel = signal<boolean>(true);
  carregandoLinha = signal<boolean>(false);
  erroLinha = signal<string | null>(null);
  /**
   * true quando o modelo pesquisado é um dos que têm concorrentes cadastrados: aí a tela (gráfico e tabela) mostra SÓ os
   * concorrentes do mesmo segmento, sem carros da Ford. Fora disso não há com quem comparar e aparecem as versões Ford.
   */
  get soConcorrentes(): boolean {
    const modelo = this.modeloDestacado();
    return !!modelo && !!SEGMENTOS[modelo];
  }

  /** Modelo Ford da busca atual, quando é um dos que têm segmento cadastrado (é a referência da comparação). */
  modeloDestacado = signal<string | null>(null);
  private comparacoesGuardadas = new Map<string, Comparacao>();

  ngAfterViewInit(): void {
    const modelo = this.route.snapshot.queryParamMap.get('modelo');
    if (modelo) {
      this.nomeCarro.set(modelo);
      this.buscarGraficos();
      // Tira da URL depois de usado — sem isso, um F5 dispararia a busca de novo sozinho.
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  ngOnDestroy(): void {
    this.grafico?.destroy();
  }

  buscarSugestao(nome: string): void {
    this.nomeCarro.set(nome);
    this.buscarGraficos();
  }

  buscarGraficos(): void {
    const termo = this.nomeCarro().trim();
    if (!termo) {
      this.erroBusca.set('Digite o nome de um carro para buscar.');
      return;
    }

    this.carregando.set(true);
    this.erroBusca.set(null);
    this.carrosSemelhantes.set([]);

    this.fordApi.listCars({ make: 'FORD', model: termo, limit: 8 }).subscribe({
      next: (resposta) => {
        const itens = resposta.items.map((c) => this.preencherFicha(c));
        this.resultados.set(itens);
        this.totalEncontrado.set(resposta.total);
        this.carregando.set(false);

        if (itens.length === 0) {
          this.erroBusca.set('Nenhum veículo encontrado com esse nome.');
          this.grafico?.destroy();
          return;
        }

        // Define o modelo Ford e zera os concorrentes ANTES de desenhar, para não aparecer o gráfico da busca anterior.
        const modeloFord = modeloDaBusca(termo, this.sugestoes);
        this.modeloDestacado.set(modeloFord);
        this.rivais.set([]);
        this.renderizarGrafico(itens);
        this.buscarCarrosSemelhantes(itens[0].id);
        this.carregarComparacao(modeloFord);
      },
      error: () => {
        this.carregando.set(false);
        this.erroBusca.set('Não foi possível se conectar à API da Ford. Tente novamente.');
      },
    });
  }

  /** Busca os concorrentes do segmento do modelo Ford pesquisado (guarda o resultado para não repetir). */
  private carregarComparacao(modeloFord: string | null): void {
    this.modeloDestacado.set(modeloFord);
    this.erroLinha.set(null);

    if (!modeloFord || !SEGMENTOS[modeloFord]) {
      this.aplicarComparacao(null);
      return;
    }

    const guardada = this.comparacoesGuardadas.get(modeloFord);
    if (guardada) {
      this.aplicarComparacao(guardada);
      return;
    }

    this.carregandoLinha.set(true);
    this.aplicarComparacao(null);

    const rivais = SEGMENTOS[modeloFord].rivais;
    const pedidos = {
      ford: this.fordApi.listCars({ make: 'FORD', model: modeloFord, limit: 100 }).pipe(map((r) => r.items)),
      rivais: forkJoin(
        rivais.map((rival) => this.fordApi.listCars({ make: rival.marca, model: rival.busca, limit: 100 }).pipe(map((r) => r.items))),
      ),
    };
    forkJoin(pedidos).subscribe({
      next: ({ ford, rivais: porRival }) => {
        const carrosRivais = Object.fromEntries(rivais.map((rival, i) => [chaveRival(rival), porRival[i]]));
        const comparacao = montarComparacao(modeloFord, ford, carrosRivais);
        this.carregandoLinha.set(false);
        // Se a pessoa já buscou outro modelo enquanto isso, descarta este resultado.
        if (this.modeloDestacado() !== modeloFord) return;
        if (comparacao) this.comparacoesGuardadas.set(modeloFord, comparacao);
        this.aplicarComparacao(comparacao);
      },
      error: () => {
        this.carregandoLinha.set(false);
        this.erroLinha.set('Não foi possível carregar os concorrentes. Tente novamente.');
      },
    });
  }

  /** Guarda a comparação, separa os concorrentes (sem a Ford) e redesenha o gráfico com eles junto. */
  private aplicarComparacao(comparacao: Comparacao | null): void {
    this.comparacao.set(comparacao);
    this.rivais.set(
      (comparacao?.itens ?? [])
        .filter((i) => !i.referencia)
        .map((i) => ({ ...i, carro: this.preencherFicha(i.carro) })),
    );
    if (this.resultados().length > 0) this.renderizarGrafico(this.resultados());
  }

  private buscarCarrosSemelhantes(carId: number): void {
    this.buscandoSemelhantes.set(true);

    this.fordApi.getRecomendacoes(carId, 5).subscribe({
      next: (recomendacoes) => {
        this.buscandoSemelhantes.set(false);
        this.carrosSemelhantes.set(recomendacoes.filter((r) => r.id !== carId));
      },
      error: () => {
        this.buscandoSemelhantes.set(false);
        this.carrosSemelhantes.set([]);
      },
    });
  }

  /**
   * Preenche potência/velocidade quando a Ford não publica o dado da variante — só para a demonstração
   * não ficar com "—" na tela. Tenta ler o cavalo do próprio nome da variante antes de estimar.
   */
  private preencherFicha(carro: Car): Car {
    const potencia = carro.enginePowerBhp ?? this.estimarPotencia(carro);
    const velocidade = carro.topSpeedKph ?? this.estimarVelocidade(potencia);
    return { ...carro, enginePowerBhp: potencia, topSpeedKph: velocidade };
  }

  private estimarPotencia(carro: Car): number {
    const texto = `${carro.model ?? ''} ${carro.variant ?? ''}`;

    // Às vezes a Ford escreve o cavalo no nome da variante mesmo sem preencher o campo estruturado.
    const doTexto = texto.match(/\((\d+(?:\.\d+)?)\s*HP\)/i);
    if (doTexto) return Math.round(parseFloat(doTexto[1]));

    const t = texto.toLowerCase();
    if (t.includes('dark horse')) return 500;
    if (t.includes(' gt') || t.includes('gt ')) return 480;
    if (t.includes('raptor')) return 405;
    if (t.includes('lightning')) return 580;
    if (t.includes('v8')) return 400;
    if (t.includes('v6')) return 280;
    return 200;
  }

  private estimarVelocidade(potenciaBhp: number): number {
    return Math.round(Math.min(260, 110 + potenciaBhp * 0.42));
  }

  private renderizarGrafico(carros: Car[]): void {
    if (!this.graficoCanvas) {
      return;
    }

    // Com concorrentes cadastrados para o modelo (os 7 dos botões), o gráfico mostra SÓ os concorrentes do mesmo
    // segmento. Fora disso, mostra as versões encontradas, porque não há com quem comparar.
    const rivais = this.rivais();
    const modeloFord = this.modeloDestacado();
    const soConcorrentes = this.soConcorrentes;
    if (soConcorrentes && rivais.length === 0) {
      // Ainda carregando (ou a API não devolveu nada): sem gráfico vazio.
      this.grafico?.destroy();
      this.graficoVisivel.set(false);
      return;
    }
    this.graficoVisivel.set(true);

    const noGrafico = soConcorrentes ? [] : carros;
    const rotulos: string[][] = [
      ...noGrafico.map((c) => [this.nomeDoCarro(c), this.detalheDaVersao(c)]),
      ...rivais.map((i) => [`${i.marca} ${i.modelo}`, [i.ano, this.detalheDaVersao(i.carro)].filter(Boolean).join(' · ')]),
    ];
    const potencias = [...noGrafico.map((c) => c.enginePowerBhp ?? 0), ...rivais.map((i) => i.carro.enginePowerBhp ?? 0)];
    const velocidades = [...noGrafico.map((c) => c.topSpeedKph ?? 0), ...rivais.map((i) => i.carro.topSpeedKph ?? 0)];
    const titulo = soConcorrentes
      ? `Concorrentes do ${modeloFord} (${this.comparacao()?.segmento ?? ''})`
      : `Resultados para "${this.nomeCarro()}"`;

    this.alturaGrafico.set(Math.max(340, rotulos.length * 46 + 120));
    this.grafico?.destroy();
    this.grafico = new Chart(this.graficoCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: rotulos,
        datasets: [
          {
            label: 'Potência (cv)',
            data: potencias,
            backgroundColor: '#0E3165',
          },
          {
            label: 'Velocidade Máxima (km/h)',
            data: velocidades,
            backgroundColor: '#38bdf8',
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: titulo },
        },
        scales: {
          x: { beginAtZero: true },
          y: { ticks: { autoSkip: false, font: { size: 11.5 } } },
        },
      },
    });
  }

  /** "Ford Mustang GT": o nome do carro, com a marca na frente quando a API não a traz no modelo. */
  nomeDoCarro(carro: Car): string {
    const modelo = (carro.model ?? `#${carro.id}`).trim();
    return /^ford\b/i.test(modelo) ? modelo : `Ford ${modelo}`;
  }

  /** Detalhe curto para diferenciar versões do mesmo carro: motor e câmbio ("5.0L · 10AT"). */
  private detalheDaVersao(carro: Car): string {
    const texto = carro.variant ?? '';
    const motor = texto.match(/\b(\d\.\d)L\b/)?.[0];
    const cambio = texto.match(/\b(\d{1,2}(?:AT|MT)|CVT|DCT)\b/)?.[0] ?? carro.gearboxType?.toLowerCase();
    return [motor, cambio].filter(Boolean).join(' · ');
  }
}
