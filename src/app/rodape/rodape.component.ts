import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Rodapé institucional (cookies, privacidade, contato...) reutilizado em todas as páginas internas. */
@Component({
  selector: 'seia-rodape',
  standalone: true,
  templateUrl: './rodape.component.html',
  styleUrl: './rodape.component.css',
})
export class RodapeComponent {
  private router = inject(Router);

  /** Só os links com página real navegam. Os demais são links de fachada: reagem ao clique, mas não levam a lugar nenhum. */
  private readonly rotas: Record<string, string> = {
    cookies: '/termos',
  };

  ir(chave: string, evento: Event): void {
    evento.preventDefault();
    const rota = this.rotas[chave];
    if (rota) this.router.navigateByUrl(rota);
  }
}
