import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Concessionaria {
  id: number;
  nome: string;
  distancia: number;
  endereco: string;
  telefone: string;
  posicaoMapa: { top: string; left: string };
}

@Component({
  selector: 'app-concessionarias',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './concessionarias.component.html',
  styleUrls: ['./concessionarias.component.css'],
})
export class ConcessionariasComponent {
  protected readonly title = signal('meu-projeto');

  // Declaração dos Signals de Controle de Menu e Sidebar
  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false);

  // Signals de Filtro e Busca
  buscaLocalizacao = signal<string>('São Paulo, SP');
  raioBusca = signal<number>(20);

  // Signal para controlar a imagem e o zoom do mapa ilustrativo
  imagemMapa = signal<string>('assets/imagens/mapa-sao-paulo.png');
  nivelZoom = signal<number>(1);

  // Lista de Concessionárias
  concessionarias = signal<Concessionaria[]>([
    {
      id: 1,
      nome: 'FORD SÃO JOSÉ',
      distancia: 3.2,
      endereco: 'Av. Francisco Morato, 1200 - Butantã',
      telefone: '(11) 5555-1200',
      posicaoMapa: { top: '25%', left: '39%' }
    },
    {
      id: 2,
      nome: 'FORD IBIRAPUERA',
      distancia: 6.1,
      endereco: 'Av. Ibirapuera, 3500 - Moema',
      telefone: '(11) 5555-3500',
      posicaoMapa: { top: '55%', left: '33%' }
    },
    {
      id: 3,
      nome: 'FORD POMPÉIA',
      distancia: 7.9,
      endereco: 'R. Clélia, 1800 - Pompéia',
      telefone: '(11) 5555-1800',
      posicaoMapa: { top: '48%', left: '30%' }
    },
    {
      id: 4,
      nome: 'FORD ANHEMBI',
      distancia: 9.3,
      endereco: 'Av. Olavo Fontoura, 1209 - Santana',
      telefone: '(11) 5555-1209',
      posicaoMapa: { top: '35%', left: '43%' }
    }
  ]);

  // Ações do Filtro e Mapa
  atualizarBusca(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.buscaLocalizacao.set(valor);
  }

  atualizarRaio(event: Event): void {
    const valor = Number((event.target as HTMLSelectElement).value);
    this.raioBusca.set(valor);
  }

  buscarConcessionarias(): void {
    alert(`Buscando concessionárias próximo a "${this.buscaLocalizacao()}" em um raio de ${this.raioBusca()} km.`);
  }

  recalcularLocalizacao(): void {
    alert('Recalculando localização atual via GPS...');
  }

  agendarTestDrive(unidade: Concessionaria): void {
    alert(`Iniciando agendamento para a unidade: ${unidade.nome}`);
  }

  focarNoMapa(id: number): void {
    alert(`Centralizando mapa na concessionária #${id}`);
  }

  selecionarConcessionaria(id: number): void {
    this.focarNoMapa(id);
  }

  // Ajusta o zoom da imagem do mapa (limites entre 0.8 e 2.0)
  alterarZoom(delta: number): void {
    const novoZoom = Math.min(Math.max(this.nivelZoom() + delta, 0.8), 2.0);
    this.nivelZoom.set(Number(novoZoom.toFixed(1)));
  }

  // Métodos do Menu Dropdown do Cabeçalho
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
    this.fecharMenus();
  }

  fecharSidebar(): void {
    this.sidebarAberta.set(false);
  }
}