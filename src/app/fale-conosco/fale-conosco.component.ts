import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-fale-conosco',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './fale-conosco.component.html',
  styleUrl: './fale-conosco.component.css',
})
export class FaleConoscoComponent {
  protected readonly title = signal('meu-projeto');

  // Controle da Sidebar e Menus Dropdown
  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false);

  // Funcionalidades da tela Fale Conosco
  termoBusca = signal<string>('');

  atualizarBusca(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.termoBusca.set(input.value);
  }

  abrirChatSeia(): void {
    alert('Iniciando o atendimento assistido pela SEIA...');
  }

  verFaqCompleto(): void {
    alert(`Buscando por: "${this.termoBusca()}" no FAQ...`);
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
}