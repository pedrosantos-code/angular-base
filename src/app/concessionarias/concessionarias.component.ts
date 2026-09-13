import { Component, signal, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';

export interface Concessionaria {
  id: number;
  nome: string;
  distancia: number;
  endereco: string;
  telefone: string;
  coordenadas: [number, number]; // [latitude, longitude]
}

@Component({
  selector: 'app-concessionarias',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './concessionarias.component.html',
  styleUrls: ['./concessionarias.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ConcessionariasComponent implements AfterViewInit {
  protected readonly title = signal('meu-projeto');

  // Controles de Menu e Sidebar
  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false);

  // Filtro e Busca
  buscaLocalizacao = signal<string>('São Paulo, SP');
  raioBusca = signal<number>(20);

  // Instância do mapa
  private map!: L.Map;
  private marcadores: L.Marker[] = [];

  // Base completa com Concessionárias REAIS da Ford na Capital de São Paulo
  private todasConcessionarias: Concessionaria[] = [
    {
      id: 1,
      nome: 'FORD CAOA CEASA',
      distancia: 0,
      endereco: 'Dr. Gastão Vidigal, 1250 - Vila Leopoldina',
      telefone: '(11) 3648-5000',
      coordenadas: [-23.5358, -46.7285]
    },
    {
      id: 2,
      nome: 'FORD CAOA IBIRAPUERA',
      distancia: 0,
      endereco: 'Av. Ibirapuera, 2400 - Moema',
      telefone: '(11) 5053-9000',
      coordenadas: [-23.6012, -46.6644]
    },
    {
      id: 3,
      nome: 'FORD CAOA JABAQUARA',
      distancia: 0,
      endereco: 'Avenida Jabaquara, 2207 - Jabaquara',
      telefone: '(11) 5074-3000',
      coordenadas: [-23.6264, -46.6385]
    },
    {
      id: 4,
      nome: 'FORD SONNERVIG VILA GUILHERME',
      distancia: 0,
      endereco: 'Rua dos Machados, 150 - Vila Guilherme',
      telefone: '(11) 2971-7171',
      coordenadas: [-23.5152, -46.6083]
    },
    {
      id: 5,
      nome: 'FORD SONNERVIG RICARDO JAFET',
      distancia: 0,
      endereco: 'Av. Dr. Ricardo Jafet, 1301 - Vila Mariana',
      telefone: '(11) 93291-1405',
      coordenadas: [-23.5931, -46.6214]
    },
    {
      id: 6,
      nome: 'FORD FOR SÃO PAULO',
      distancia: 0,
      endereco: 'Av. das Nações Unidas, 21883 - Santo Amaro',
      telefone: '(11) 5600-0600',
      coordenadas: [-23.6782, -46.7021]
    }
  ];

  // Signal exibido na tela (filtrado)
  concessionarias = signal<Concessionaria[]>(this.todasConcessionarias);

  ngAfterViewInit(): void {
    this.inicializarMapa();
  }

  // Inicializa o mapa com Leaflet centrado em São Paulo
  private inicializarMapa(): void {
    this.map = L.map('mapa-concessionarias', {
      zoomControl: false 
    }).setView([-23.5505, -46.6333], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    L.control.zoom({ position: 'topleft' }).addTo(this.map);

    this.atualizarMarcadores(this.concessionarias());
  }

  // Atualiza os marcadores no mapa de forma limpa
  private atualizarMarcadores(lista: Concessionaria[]): void {
    // Remove marcadores antigos
    this.marcadores.forEach(m => this.map.removeLayer(m));
    this.marcadores = [];

    // Adiciona os novos
    lista.forEach((unidade) => {
      const marker = L.marker(unidade.coordenadas)
        .addTo(this.map)
        .bindPopup(`<b>${unidade.nome}</b><br>${unidade.endereco}`);

      marker.on('click', () => {
        this.selecionarConcessionaria(unidade.id);
      });

      this.marcadores.push(marker);
    });
  }

  // Ações do Filtro e Mapa
  atualizarBusca(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.buscaLocalizacao.set(valor);
  }

  atualizarRaio(event: Event): void {
    const valor = Number((event.target as HTMLSelectElement).value);
    this.raioBusca.set(valor);
  }

  // Função Principal de Busca Geocodificada
  buscarConcessionarias(): void {
    const termo = this.buscaLocalizacao().trim();
    if (!termo) {
      alert('Por favor, digite um CEP ou Cidade.');
      return;
    }

    // Consulta API pública de geocodificação (Nominatim) para achar a cidade/CEP digitado
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(termo + ', São Paulo, Brazil')}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);

          // Recentraliza o mapa no endereço buscado
          this.map.setView([lat, lon], 13, { animate: true });

          // Calcula a distância real de cada concessionária até o ponto buscado e filtra pelo raio
          const raioMaximo = this.raioBusca();
          const atualizadas = this.todasConcessionarias.map(unidade => {
            const distanciaCalculada = this.calcularDistancia(lat, lon, unidade.coordenadas[0], unidade.coordenadas[1]);
            return {
              ...unidade,
              distancia: Number(distanciaCalculada.toFixed(1))
            };
          }).filter(unidade => unidade.distancia <= raioMaximo);

          // Atualiza a lista exibida e os marcadores
          this.concessionarias.set(atualizadas);
          this.atualizarMarcadores(atualizadas);

          if (atualizadas.length === 0) {
            alert('Nenhuma concessionária encontrada dentro do raio selecionado.');
          }
        } else {
          alert('Localização não encontrada. Tente digitar um CEP válido ou nome de bairro/cidade em SP.');
        }
      })
      .catch(err => {
        console.error('Erro ao buscar localização:', err);
        alert('Erro ao processar a busca.');
      });
  }

  // Fórmula de Haversine para calcular distância em KM entre dois pontos de GPS
  private calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  recalcularLocalizacao(): void {
    this.map.setView([-23.5505, -46.6333], 12);
    this.concessionarias.set(this.todasConcessionarias);
    this.atualizarMarcadores(this.todasConcessionarias);
    this.buscaLocalizacao.set('São Paulo, SP');
  }

  agendarTestDrive(unidade: Concessionaria): void {
    alert(`Iniciando agendamento para a unidade: ${unidade.nome}`);
  }

  focarNoMapa(id: number): void {
    const unidade = this.concessionarias().find(c => c.id === id);
    if (unidade) {
      this.map.setView(unidade.coordenadas, 15, { animate: true });
    }
  }

  selecionarConcessionaria(id: number): void {
    this.focarNoMapa(id);
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

  abrirSidebar(): void {
    this.sidebarAberta.set(true);
    this.fecharMenus();
  }

  fecharSidebar(): void {
    this.sidebarAberta.set(false);
  }
}