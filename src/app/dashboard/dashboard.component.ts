import { Component, ElementRef, ViewChild, signal, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Car, CarRecommendation, FordApiService } from '../ford-api.service';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, TopbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  protected readonly title = signal('meu-projeto');

  private fordApi = inject(FordApiService);
  private router = inject(Router);

  @ViewChild('graficoCanvas') graficoCanvas?: ElementRef<HTMLCanvasElement>;
  private grafico?: Chart;

  onNavegar(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  /** Rotas dos links de rodapé que não fazem parte do menu principal da gaveta. */
  private readonly rotasRodape: Record<string, string> = {
    cookies: '/termos',
    privacidade: '/termos',
    contato: '/fale-conosco',
  };

  irRodape(chave: string): void {
    const rota = this.rotasRodape[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  irPerfil(): void {
    this.router.navigateByUrl('/perfil');
  }

  sair(): void {
    this.router.navigateByUrl('/');
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

  ngAfterViewInit(): void {}

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

    this.fordApi.listCars({ model: termo, limit: 8 }).subscribe({
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
      },
      error: () => {
        this.carregando.set(false);
        this.erroBusca.set('Não foi possível se conectar à API da Ford. Tente novamente.');
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
