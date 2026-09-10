import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent {
  protected readonly title = signal('meu-projeto');

  // Signals do Formulário de Perfil
  nomeCompleto = signal<string>('');
  email = signal<string>('e-mail@ford.com');
  telefone = signal<string>('12/233456789');
  preferencias = signal<string>('Preferências e motor');

  // Declaração dos Signals da Interface
  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false);

  // Ações do Formulário do Perfil
  salvarAlteracoes(): void {
    alert('Alterações salvas com sucesso!');
  }

  abrirFavoritos(): void {
    alert('Redirecionando para Meus Favoritos...');
  }

  abrirDashboardDetalhado(): void {
    alert('Redirecionando para Dashboard Detalhado...');
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