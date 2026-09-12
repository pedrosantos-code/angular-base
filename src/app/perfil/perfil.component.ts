import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent implements OnInit {
  protected readonly title = signal('meu-projeto');

  // Injeção de dependências
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals do Formulário de Perfil
  nomeCompleto = signal<string>('');
  email = signal<string>('');
  telefone = signal<string>('');
  preferencias = signal<string>('Preferências e motor');

  // Variáveis para guardar o estado inicial e comparar se mudou algo
  private valorInicialNome = '';
  private valorInicialTelefone = '';
  private valorInicialPreferencias = '';

  // Declaração dos Signals da Interface
  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false);

  ngOnInit(): void {
    this.authService.getCurrentUserEmail().subscribe(emailSalvo => {
      if (emailSalvo) {
        this.email.set(emailSalvo);
      }
    });

    this.valorInicialNome = this.nomeCompleto();
    this.valorInicialTelefone = this.telefone();
    this.valorInicialPreferencias = this.preferencias();
  }

  // Ações do Formulário do Perfil
  salvarAlteracoes(): void {
    const nomeAtual = this.nomeCompleto();
    const telefoneAtual = this.telefone();
    const preferenciasAtual = this.preferencias();

    // Verifica se nada foi alterado em comparação ao estado inicial
    const houveMudanca = 
      nomeAtual !== this.valorInicialNome ||
      telefoneAtual !== this.valorInicialTelefone ||
      preferenciasAtual !== this.valorInicialPreferencias;

    if (!houveMudanca) {
      alert('Nenhuma alteração foi realizada.');
      return;
    }

    // Se houve mudança, exibe o sucesso e redireciona direto para a home
    console.log('Salvando dados para:', {
      nome: nomeAtual,
      email: this.email(),
      telefone: telefoneAtual,
      preferencias: preferenciasAtual
    });

    alert('Alterações salvas com sucesso!');
    this.router.navigate(['/home']);
  }

  abrirFavoritos(): void {
    alert('Redirecionando para Meus Favoritos...');
  }

  abrirDashboardDetalhado(): void {
    this.router.navigate(['/dashboard']);
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
    this.fecharMenus();
  }

  fecharSidebar(): void {
    this.sidebarAberta.set(false);
  }
}