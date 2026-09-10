import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

interface Agendamento {
  id: number;
  titulo: string;
  dataHora: string;
}

@Component({
  selector: 'app-agendamentos',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './agendamentos.component.html',
  styleUrl: './agendamentos.component.css',
})
export class AgendamentosComponent {
  protected readonly title = signal('meu-projeto');

  // Declaração dos Signals
  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false);

  // Lista de Agendamentos para a Interface
  agendamentos = signal<Agendamento[]>([
    { id: 1, titulo: 'Test-Drive: Ford Ranger', dataHora: '13/10/2023 18:00' },
    { id: 2, titulo: 'Visita à Concessionária: Ford Territory', dataHora: '14/10/2023 15:30' },
    { id: 3, titulo: 'Visita à Concessionária: Ford Territory', dataHora: '14/10/2023 15:30' },
    { id: 4, titulo: 'Test-Drive: Ford Ranger', dataHora: '18/10/2023 18:00' }
  ]);

  // Ações do Calendário e Agendamentos
  mudarMes(direcao: number): void {
    // Lógica para navegação entre os meses
  }

  novoAgendamento(): void {
    alert('Abrir tela/modal de Novo Agendamento');
  }

  detalharAgendamento(id: number): void {
    alert(`Visualizando agendamento #${id}`);
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