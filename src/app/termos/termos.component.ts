import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

interface Termo {
  id: number;
  titulo: string;
  descricao: string;
  topicos?: string[];
  aberto: boolean;
}

@Component({
  selector: 'app-termos',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './termos.component.html',
  styleUrl: './termos.component.css',
})
export class TermosComponent {
  private router = inject(Router);

  protected readonly title = signal('meu-projeto');

  // Controle da Sidebar e Menus
  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false);

  // Controle dos Termos e Aceite
  concordou = signal<boolean>(false);
  
  // Controle da Mensagem de Sucesso
  mensagemSalva = signal<boolean>(false);

  termos = signal<Termo[]>([
    {
      id: 1,
      titulo: 'Termos de Uso da Plataforma Ford + SEIA',
      descricao: 'Ao utilizar a Plataforma Ford + SEIA, você concorda em cumprir integralmente as diretrizes de navegação, privacidade e segurança previstas nos termos da plataforma.',
      topicos: [
        'Aceita utilizar os serviços da Plataforma Ford + SEIA de forma adequada;',
        'Responsabilidade de manter suas credenciais de acesso seguras;',
        'Coleta de dados direcionada à personalização do atendimento com a IA SEIA;',
        'Recomendações inteligentes baseadas nas suas preferências de compra e serviços.'
      ],
      aberto: true
    },
    {
      id: 2,
      titulo: 'Política de Privacidade e Cookies',
      descricao: 'Respeitamos a sua privacidade. Esta política descreve como coletamos, armazenamos e utilizamos seus dados pessoais para oferecer uma experiência personalizada com a tecnologia SEIA e nossa rede de concessionárias.',
      aberto: false
    },
    {
      id: 3,
      titulo: 'Contrato de Consentimento para Test-Drives',
      descricao: 'Diretrizes legais para o agendamento e realização de rotas de test-drive em veículos Ford, incluindo cobertura de seguro e responsabilidades do condutor durante o uso.',
      aberto: false
    },
    {
      id: 4,
      titulo: 'Termos de Compartilhamento de Preferências com Concessionárias',
      descricao: 'Autorização para que a inteligência SEIA compartilhe suas especificações e personalizações do veículo escolhido com a concessionária Ford selecionada para otimizar seu atendimento.',
      aberto: false
    }
  ]);

  // Métodos do Accordion
  toggleAccordion(id: number): void {
    this.termos.update(lista =>
      lista.map(item =>
        item.id === id ? { ...item, aberto: !item.aberto } : item
      )
    );
  }

  toggleConcordo(): void {
    this.concordou.update(val => !val);
  }

  // Método do Botão Salvar e Continuar
  salvarTermos(): void {
    if (this.concordou()) {
      this.mensagemSalva.set(true);

      // Exibe a mensagem por 3 segundos e redireciona para a home
      setTimeout(() => {
        this.mensagemSalva.set(false);
        this.router.navigate(['/home']);
      }, 3000);
    }
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