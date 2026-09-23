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

  // Passos de funcionamento do agente (base: API Pessoas, afinidade de frota por perfil demográfico)
  readonly passos: PassoFuncionamento[] = [
    { n: '01', titulo: 'Descreva o perfil', texto: 'Gênero, idade e cidade numa frase só, ou direto nos campos. Renda e escolaridade refinam o resultado.' },
    { n: '02', titulo: 'Consulta a frota real', texto: 'O agente cruza esse perfil com o cadastro de veículos de São Paulo e mede o quanto cada modelo aparece a mais ou a menos que a média do município.' },
    { n: '03', titulo: 'Resultado com dados reais', texto: 'Você recebe os modelos por afinidade real com o grupo — "1 em cada 12 carros", "30% a mais que a média" — pronto para a reunião.' },
  ];

  ir(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    void this.authService.logout();
  }
}
