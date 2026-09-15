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

  /** Só os links com página real navegam. Os demais ficam inertes até existir conteúdo pra eles. */
  private readonly rotas: Record<string, string> = {
    cookies: '/termos',
    privacidade: '/termos',
    contato: '/fale-conosco',
  };

  ir(chave: string): void {
    const rota = this.rotas[chave];
    if (rota) this.router.navigateByUrl(rota);
  }
}
