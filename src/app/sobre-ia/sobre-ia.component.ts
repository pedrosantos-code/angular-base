import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-sobre-ia',
  imports: [RouterLink],
  templateUrl: './sobre-ia.component.html',
  styleUrl: './sobre-ia.component.css',
})

export class SobreIAComponent {
  protected readonly title = signal('meu-projeto');

  // Declaração dos Signals
  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false); 

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