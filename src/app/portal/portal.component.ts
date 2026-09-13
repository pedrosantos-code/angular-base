import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Car, CarRecommendation, FordApiService } from '../ford-api.service';

Chart.register(...registerables);

@Component({
  selector: 'app-portal',
  imports: [RouterLink, FormsModule],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.css',
})
export class PortalComponent implements AfterViewInit, OnDestroy {
  protected readonly title = signal('meu-projeto');

  private fordApi = inject(FordApiService);

  // Controle dos menus dropdown
  menuAberto = signal<string | null>(null);

  // Controle da exibição da barra lateral
  sidebarAberta = signal<boolean>(false);

  // Controle das tags de filtro da busca rápida
  tagSelecionada = signal<string | null>(null);

  // Busca de veículo na API da Ford (pesquisa-ia-container)
  nomeCarroBusca = signal<string>('');
  buscandoCarro = signal<boolean>(false);
  erroBuscaCarro = signal<string | null>(null);
  resultadosBusca = signal<Car[]>([]);

  // Carros semelhantes ao primeiro resultado da busca
  buscandoSemelhantes = signal<boolean>(false);
  carrosSemelhantes = signal<CarRecommendation[]>([]);

  @ViewChild('graficoBuscaCanvas') graficoBuscaCanvas?: ElementRef<HTMLCanvasElement>;
  private graficoBusca?: Chart;

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.graficoBusca?.destroy();
  }

  buscarCarroComIA(): void {
    const termo = this.nomeCarroBusca().trim();
    if (!termo) {
      this.erroBuscaCarro.set('Digite o nome de um carro para buscar.');
      return;
    }

    this.buscandoCarro.set(true);
    this.erroBuscaCarro.set(null);
    this.carrosSemelhantes.set([]);

    this.fordApi.listCars({ model: termo, limit: 8 }).subscribe({
      next: (resposta) => {
        this.buscandoCarro.set(false);
        this.resultadosBusca.set(resposta.items);

        if (resposta.items.length === 0) {
          this.erroBuscaCarro.set('Nenhum veículo encontrado com esse nome.');
          this.graficoBusca?.destroy();
          return;
        }

        this.renderizarGraficoBusca(resposta.items);
        this.buscarCarrosSemelhantes(resposta.items[0].id);
      },
      error: () => {
        this.buscandoCarro.set(false);
        this.erroBuscaCarro.set('Não foi possível se conectar à API da Ford. Tente novamente.');
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

  private renderizarGraficoBusca(carros: Car[]): void {
    if (!this.graficoBuscaCanvas) {
      return;
    }

    const rotulos = carros.map((c) => c.variant ?? c.model ?? `#${c.id}`);
    const potencias = carros.map((c) => c.enginePowerBhp ?? 0);
    const velocidades = carros.map((c) => c.topSpeedKph ?? 0);

    this.graficoBusca?.destroy();
    this.graficoBusca = new Chart(this.graficoBuscaCanvas.nativeElement, {
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
          title: { display: true, text: `Resultados para "${this.nomeCarroBusca()}"` },
        },
        scales: {
          x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 } },
          y: { beginAtZero: true },
        },
      },
    });
  }

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

  // Método para marcar e desmarcar as tags de busca rápida
  selecionarTag(tag: string): void {
    if (this.tagSelecionada() === tag) {
      this.tagSelecionada.set(null); // Desmarca se for clicado novamente
    } else {
      this.tagSelecionada.set(tag); // Marca a tag clicada
    }
  }
}