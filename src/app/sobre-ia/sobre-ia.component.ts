import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

interface PassoIA {
  passo: number;
  titulo: string;
  descricao: string;
}

@Component({
  selector: 'app-sobre-ia',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sobre-ia.component.html',
  styleUrl: './sobre-ia.component.css',
})
export class SobreIAComponent {
  protected readonly title = signal('meu-projeto');

  // Declaração dos Signals da Interface
  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false);

  // Informações do Sistema SEIA
  versaoIA = signal<string>('SEIA v2.4 - Ford Engine');
  statusAlgoritmo = signal<'Ativo' | 'Processando' | 'Manutenção'>('Ativo');

  // Passos de Funcionamento da IA
  passosIA = signal<PassoIA[]>([
    {
      passo: 1,
      titulo: 'Seu Perfil',
      descricao: 'Rotina, Preferências, Orçamento'
    },
    {
      passo: 2,
      titulo: 'Engenharia Ford',
      descricao: 'Ficha Técnica, Consumo, Espaço'
    },
    {
      passo: 3,
      titulo: 'Match Perfeito',
      descricao: 'Recomendação com Compatibilidade Real'
    }
  ]);

  // Ações da IA
  iniciarSimulacaoMatch(): void {
    alert('Iniciando análise de perfil com a IA (SEIA)...');
  }

  // Métodos do Menu Dropdown
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
}