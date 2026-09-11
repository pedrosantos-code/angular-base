import { Component, signal, computed, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export interface VeiculoFord {
  id: number;
  nome: string;
  precoAPartir: string;
  motorizacao: string;
  tracao: string;
  categoria: 'SUVs' | 'Picapes' | 'Esportivos' | 'Elétricos' | 'Híbridos' | 'Comerciais';
  imagemUrl: string;
}

@Component({
  selector: 'app-modelos',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './modelos.component.html',
  styleUrl: './modelos.component.css',
})
export class ModelosComponent {
  // Injeção de Serviços
  private authService = inject(AuthService);
  private router = inject(Router);

  protected readonly title = signal('meu-projeto');

  // Declaração dos Signals do Menu e Sidebar
  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false);

  // Categorias disponíveis para o filtro
  categorias = signal<string[]>([
    'Todos',
    'SUVs',
    'Picapes',
    'Esportivos',
    'Elétricos',
    'Híbridos',
    'Comerciais'
  ]);

  // Categoria atualmente selecionada
  categoriaAtiva = signal<string>('Todos');

  // Lista dos veículos mais relevantes da Ford
  modelos = signal<VeiculoFord[]>([
    // --- SUVs ---
    {
      id: 1,
      nome: 'FORD BRONCO SPORT',
      precoAPartir: 'R$ 252.790',
      motorizacao: 'Motor 2.0 EcoBoost (253 cv)',
      tracao: '4x4',
      categoria: 'SUVs',
      imagemUrl: '/bronco-sport.jpg'
    },
    {
      id: 2,
      nome: 'FORD TERRITORY',
      precoAPartir: 'R$ 209.990',
      motorizacao: 'Motor 1.5 EcoBoost (169 cv)',
      tracao: 'FWD',
      categoria: 'SUVs',
      imagemUrl: '/territory.jpg'
    },
    {
      id: 3,
      nome: 'FORD EXPLORER',
      precoAPartir: 'R$ 380.000',
      motorizacao: 'Motor 3.0 V6 EcoBoost (400 cv)',
      tracao: 'AWD',
      categoria: 'SUVs',
      imagemUrl: '/explorer.jpeg'
    },

    // --- PICAPES ---
    {
      id: 4,
      nome: 'FORD RANGER',
      precoAPartir: 'R$ 239.990',
      motorizacao: 'Motor 3.0 V6 Diesel (250 cv)',
      tracao: '4x4',
      categoria: 'Picapes',
      imagemUrl: '/ranger.jpg'
    },
    {
      id: 5,
      nome: 'FORD RANGER RAPTOR',
      precoAPartir: 'R$ 466.500',
      motorizacao: 'Motor 3.0 V6 EcoBoost (397 cv)',
      tracao: '4x4 com Reduzida',
      categoria: 'Picapes',
      imagemUrl: '/ranger-raptor.jpg'
    },
    {
      id: 6,
      nome: 'FORD MAVERICK TREMOR',
      precoAPartir: 'R$ 225.000',
      motorizacao: 'Motor 2.0 EcoBoost (253 cv)',
      tracao: 'AWD LFX4 (Integral)',
      categoria: 'Picapes',
      imagemUrl: '/maverick-tremor.jpg'
    },
    {
      id: 7,
      nome: 'FORD F-150',
      precoAPartir: 'R$ 519.990',
      motorizacao: 'Motor 5.0 V8 Coyote (405 cv)',
      tracao: '4x4',
      categoria: 'Picapes',
      imagemUrl: '/f150.jpg'
    },

    // --- ESPORTIVOS ---
    {
      id: 8,
      nome: 'FORD MUSTANG GT',
      precoAPartir: 'R$ 529.000',
      motorizacao: 'Motor 5.0 V8 Coyote (488 cv)',
      tracao: 'RWD (Traseira)',
      categoria: 'Esportivos',
      imagemUrl: '/mustang.jpg'
    },

    // --- ELÉTRICOS (Incluindo Vans) ---
    {
      id: 9,
      nome: 'FORD MUSTANG MACH-E',
      precoAPartir: 'R$ 486.000',
      motorizacao: '100% Elétrico (487 cv)',
      tracao: 'eAWD',
      categoria: 'Elétricos',
      imagemUrl: '/mach-e.jpg'
    },
    {
      id: 10,
      nome: 'FORD F-150 LIGHTNING',
      precoAPartir: 'R$ 550.000',
      motorizacao: '100% Elétrico (580 cv)',
      tracao: 'eAWD',
      categoria: 'Elétricos',
      imagemUrl: '/f150-lightning.jpg'
    },
    {
      id: 11,
      nome: 'FORD E-TRANSIT VAN',
      precoAPartir: 'R$ 319.900',
      motorizacao: '100% Elétrico (269 cv)',
      tracao: 'RWD (Traseira)',
      categoria: 'Elétricos',
      imagemUrl: '/e-transit.jpg'
    },

    // --- HÍBRIDOS ---
    {
      id: 12,
      nome: 'FORD MAVERICK HYBRID',
      precoAPartir: 'R$ 235.000',
      motorizacao: '2.5L Híbrido (194 cv)',
      tracao: 'FWD',
      categoria: 'Híbridos',
      imagemUrl: '/maverick-hybrid.jpg'
    },

    // --- COMERCIAIS ---
    {
      id: 13,
      nome: 'FORD TRANSIT FURGÃO',
      precoAPartir: 'R$ 245.900',
      motorizacao: 'Motor 2.0 EcoBlue Diesel',
      tracao: 'RWD / FWD',
      categoria: 'Comerciais',
      imagemUrl: '/transit-furgao.jpeg'
    },
    {
      id: 14,
      nome: 'FORD TRANSIT MINIBÚS',
      precoAPartir: 'R$ 299.900',
      motorizacao: 'Motor 2.0 EcoBlue Diesel',
      tracao: 'RWD',
      categoria: 'Comerciais',
      imagemUrl: '/transit-minibus.jpeg'
    }
  ]);

  // Computed signal para filtrar os carros automaticamente
  modelosFiltrados = computed(() => {
    const categoria = this.categoriaAtiva();
    if (categoria === 'Todos') {
      return this.modelos();
    }
    return this.modelos().filter(m => m.categoria === categoria);
  });

  // Método para alterar a categoria selecionada no filtro
  selecionarCategoria(categoria: string): void {
    this.categoriaAtiva.set(categoria);
  }

  // Métodos da Interface (Menu Dropdown)
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