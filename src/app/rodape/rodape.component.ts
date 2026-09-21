import { Component } from '@angular/core';

/**
 * Rodapé institucional (cookies, privacidade, contato...) reutilizado em todas as páginas internas.
 * Todos os links são de fachada: reagem ao mouse, mas o clique não leva a lugar nenhum (ainda não há página para eles).
 */
@Component({
  selector: 'seia-rodape',
  standalone: true,
  templateUrl: './rodape.component.html',
  styleUrl: './rodape.component.css',
})
export class RodapeComponent {
  semDestino(evento: Event): void {
    evento.preventDefault();
  }
}
