import { Component, ElementRef, ViewChild, signal, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { forkJoin, map } from 'rxjs';
import { Car, CarRecommendation, FordApiService } from '../ford-api.service';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { AuthService } from '../auth.service';
import { Comparacao, SEGMENTOS, chaveRival, modeloDaBusca, montarComparacao } from '../shared/comparacao-linha';

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
  @ViewChild('linhaCanvas') linhaCanvas?: ElementRef<HTMLCanvasElement>;
  private grafico?: Chart;
  private graficoLinha?: Chart;

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
  carregandoLinha = signal<boolean>(false);
  erroLinha = signal<string | null>(null);
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
    this.graficoLinha?.destroy();
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

        this.renderizarGrafico(itens);
        this.buscarCarrosSemelhantes(itens[0].id);
        this.carregarComparacao(modeloDaBusca(termo, this.sugestoes));
      },
      error: () => {
        this.carregando.set(false);
        this.erroBusca.set('Não foi possível se conectar à API da Ford. Tente novamente.');
      },
    });
  }

  /** Compara o modelo Ford pesquisado com os concorrentes do segmento dele (guarda o resultado para não repetir). */
  private carregarComparacao(modeloFord: string | null): void {
    this.modeloDestacado.set(modeloFord);
    this.erroLinha.set(null);

    if (!modeloFord || !SEGMENTOS[modeloFord]) {
      this.comparacao.set(null);
      this.graficoLinha?.destroy();
      return;
    }

    const guardada = this.comparacoesGuardadas.get(modeloFord);
    if (guardada) {
      this.comparacao.set(guardada);
      this.desenharLinha();
      return;
    }

    this.carregandoLinha.set(true);
    this.comparacao.set(null);
    this.graficoLinha?.destroy();

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
        this.comparacao.set(comparacao);
        this.desenharLinha();
      },
      error: () => {
        this.carregandoLinha.set(false);
        this.erroLinha.set('Não foi possível carregar a comparação com os concorrentes. Tente novamente.');
      },
    });
  }

  private desenharLinha(): void {
    if (!this.linhaCanvas) return;
    const itens = (this.comparacao()?.itens ?? []).filter((i) => i.potencia != null);

    this.graficoLinha?.destroy();
    this.graficoLinha = new Chart(this.linhaCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: itens.map((i) => `${i.marca} ${i.modelo}${i.ano ? ` (${i.ano})` : ''}`),
        datasets: [
          {
            label: 'Potência (cv)',
            data: itens.map((i) => i.potencia as number),
            backgroundColor: itens.map((i) => (i.referencia ? '#0E3165' : '#9FC4E8')),
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: `Potência: Ford ${this.modeloDestacado()} × concorrentes (${this.comparacao()?.segmento ?? ''})` },
        },
        scales: { x: { beginAtZero: true, title: { display: true, text: 'cv' } } },
      },
    });
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

    const rotulos = carros.map((c) => c.variant ?? c.model ?? `#${c.id}`);
    const potencias = carros.map((c) => c.enginePowerBhp ?? 0);
    const velocidades = carros.map((c) => c.topSpeedKph ?? 0);

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
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: `Resultados para "${this.nomeCarro()}"` },
        },
        scales: {
          x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 } },
          y: { beginAtZero: true },
        },
      },
    });
  }
}
