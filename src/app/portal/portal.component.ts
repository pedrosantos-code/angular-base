import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { AgenteComponent } from './agente/agente.component';
import { AuthService } from '../auth.service';

/** Página do portal: hospeda o Agente de Perfil, com o topbar e o rodapé padrão. */
@Component({
  selector: 'seia-portal',
  standalone: true,
  imports: [TopbarComponent, RodapeComponent, AgenteComponent],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.css',
})
export class PortalComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  ir(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    void this.authService.logout();
  }
}
