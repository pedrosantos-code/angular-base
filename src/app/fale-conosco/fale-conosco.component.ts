import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';

export interface MensagemChat {
  autor: 'seia' | 'usuario';
  texto: string;
}

@Component({
  selector: 'app-fale-conosco',
  standalone: true,
  imports: [RouterLink, TopbarComponent, RodapeComponent],
  templateUrl: './fale-conosco.component.html',
  styleUrl: './fale-conosco.component.css',
})
export class FaleConoscoComponent {
  protected readonly title = signal('meu-projeto');
  private router = inject(Router);

  /** Chat simulado da SEIA — respostas roteirizadas, sem chamada a IA real. */
  chatAberto = signal(false);
  chatDigitando = signal(false);
  mensagemAtual = signal('');
  mensagens = signal<MensagemChat[]>([
    {
      autor: 'seia',
      texto: 'Olá! Sou a SEIA, assistente virtual da Ford. Posso ajudar com agendamentos, modelos, concessionárias ou horários de atendimento.',
    },
  ]);

  abrirChatSeia(): void {
    this.chatAberto.set(true);
  }

  fecharChat(): void {
    this.chatAberto.set(false);
  }

  atualizarMensagemAtual(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.mensagemAtual.set(input.value);
  }

  enviarMensagem(): void {
    const texto = this.mensagemAtual().trim();
    if (!texto) return;

    this.mensagens.update((msgs) => [...msgs, { autor: 'usuario', texto }]);
    this.mensagemAtual.set('');
    this.chatDigitando.set(true);

    setTimeout(() => {
      this.mensagens.update((msgs) => [...msgs, { autor: 'seia', texto: this.responderSeia(texto) }]);
      this.chatDigitando.set(false);
    }, 700);
  }

  private responderSeia(pergunta: string): string {
    const p = pergunta.toLowerCase();
    if (p.includes('agend')) {
      return 'Você pode marcar, remarcar ou cancelar uma revisão pela página de Agendamentos, no menu principal.';
    }
    if (p.includes('model') || p.includes('preç') || p.includes('carro') || p.includes('suv') || p.includes('picape')) {
      return 'Dá uma olhada na página de Modelos: dá pra comparar preço, motorização e ficha técnica de cada Ford.';
    }
    if (p.includes('concession')) {
      return 'A gente lista as concessionárias mais próximas na página de Concessionárias, com endereço e telefone.';
    }
    if (p.includes('horári') || p.includes('horario') || p.includes('atend')) {
      return 'A Central de Relacionamento Ford atende de segunda a sexta, das 8h às 20h, pelo 0800-000-0000.';
    }
    if (p.includes('obrigad') || p.includes('valeu')) {
      return 'Por nada! Qualquer outra dúvida, é só chamar por aqui.';
    }
    return 'Anotei sua mensagem. Para esse tipo de dúvida, a Central de Relacionamento consegue ajudar melhor pelo 0800-000-0000.';
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