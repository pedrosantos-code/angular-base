import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { LinhasDeLuzComponent } from '../shared/linhas-de-luz.component';
import { AgenteComponent } from './agente/agente.component';
import { AuthService } from '../auth.service';

export interface PassoFuncionamento {
  n: string;
  titulo: string;
  texto: string;
}

@Component({
  selector: 'seia-portal',
  standalone: true,
  imports: [TopbarComponent, RodapeComponent, LinhasDeLuzComponent, AgenteComponent],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.css',
  host: { class: 'seia-pagina' },
})
export class PortalComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  ativo = 'recomendacao';

  // Passos de funcionamento da IA
  readonly passos: PassoFuncionamento[] = [
    { n: '01', titulo: 'Informe sua rotina', texto: 'Conte quantos quilômetros roda, se enfrenta trânsito ou estrada e quem viaja com você.' },
    { n: '02', titulo: 'Análise de dados', texto: 'O sistema procura no seu texto palavras de uso (família, estrada, cidade…) e orçamento, e compara com o perfil de cada modelo.' },
    { n: '03', titulo: 'Resultado inteligente', texto: 'Você recebe os modelos ordenados por % de compatibilidade, cada um com o motivo.' }
  ];

  ir(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    void this.authService.logout();
  }
}
