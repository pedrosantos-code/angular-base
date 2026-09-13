import { Component, ElementRef, ViewChild, signal, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Car, CarRecommendation, FordApiService } from '../ford-api.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  protected readonly title = signal('meu-projeto');

  private fordApi = inject(FordApiService);

  @ViewChild('graficoCanvas') graficoCanvas?: ElementRef<HTMLCanvasElement>;
  private grafico?: Chart;

  // Declaração dos Signals
  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false);

  // Busca de veículo na API da Ford
  nomeCarro = signal<string>('');
  carregando = signal<boolean>(false);
  erroBusca = signal<string | null>(null);
  totalEncontrado = signal<number>(0);
  resultados = signal<Car[]>([]);

  // Carros semelhantes ao primeiro resultado da busca
  buscandoSemelhantes = signal<boolean>(false);
  carrosSemelhantes = signal<CarRecommendation[]>([]);

  toggleMenu(nomeMenu: string): void {
    if (this.menuAberto() === nomeMenu) {
      this.menuAberto.set(null);
    } else {
      this.menuAberto.set(nomeMenu);
    }
  }

  fecharMenus(): void {
    this.menuAberto.set(null);
  }

  // Métodos da Barra Lateral (Sidebar)
  abrirSidebar(): void {
    this.sidebarAberta.set(true);
    this.fecharMenus(); // Fecha o dropdown ao abrir a barra
  }

  fecharSidebar(): void {
    this.sidebarAberta.set(false);
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.grafico?.destroy();
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
        this.resultados.set(resposta.items);
        this.totalEncontrado.set(resposta.total);
        this.carregando.set(false);

        if (resposta.items.length === 0) {
          this.erroBusca.set('Nenhum veículo encontrado com esse nome.');
          this.grafico?.destroy();
          return;
        }

        this.renderizarGrafico(resposta.items);
        this.buscarCarrosSemelhantes(resposta.items[0].id);
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
