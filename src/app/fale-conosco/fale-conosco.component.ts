import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';

@Component({
  selector: 'app-fale-conosco',
  standalone: true,
  imports: [RouterLink, TopbarComponent],
  templateUrl: './fale-conosco.component.html',
  styleUrl: './fale-conosco.component.css',
})
export class FaleConoscoComponent {
  protected readonly title = signal('meu-projeto');
  private router = inject(Router);

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

  onNavegar(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  irPerfil(): void {
    this.router.navigateByUrl('/perfil');
  }

  sair(): void {
    this.router.navigateByUrl('/');
  }
}