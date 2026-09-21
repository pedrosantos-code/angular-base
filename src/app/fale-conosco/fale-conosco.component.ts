import { Component, ElementRef, ViewChild, computed, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { TopbarComponent, ROTAS_MENU, ICONES } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { LinhasDeLuzComponent } from '../shared/linhas-de-luz.component';

export interface MensagemChat {
  autor: 'seia' | 'usuario';
  texto: string;
}

/** Botão de resposta do chat: leva a outro passo da conversa, abre uma página ou liga. */
export interface OpcaoChat {
  rotulo: string;
  proximo?: string;
  rota?: string;
  tel?: string;
}

export interface PassoChat {
  texto: string;
  opcoes: OpcaoChat[];
}

const VOLTAR: OpcaoChat = { rotulo: 'Voltar ao início', proximo: 'inicio' };

/** Roteiro do chat: cada passo tem um texto da SEIA e os botões que a pessoa pode escolher. */
const ROTEIRO: Record<string, PassoChat> = {
  inicio: {
    texto: 'Olá! Sou a SEIA, assistente virtual da Ford. Sobre o que você quer falar?',
    opcoes: [
      { rotulo: 'Escolher um modelo', proximo: 'modelos' },
      { rotulo: 'Agendar test-drive ou revisão', proximo: 'agenda' },
      { rotulo: 'Entender a nota da IA', proximo: 'ia' },
      { rotulo: 'Falar com uma pessoa', proximo: 'humano' },
    ],
  },

  modelos: {
    texto: 'Como você quer escolher o seu Ford?',
    opcoes: [
      { rotulo: 'Descrevendo meu uso', proximo: 'modelos-uso' },
      { rotulo: 'Vendo todos e comparando', proximo: 'modelos-todos' },
      { rotulo: 'Vendo a ficha técnica', proximo: 'modelos-ficha' },
      VOLTAR,
    ],
  },
  'modelos-uso': {
    texto: 'Na Recomendação, escreva como você usa o carro (ex.: "família, estrada, até 250 mil"). Você recebe os modelos em ordem de compatibilidade, cada um com o motivo.',
    opcoes: [
      { rotulo: 'Ir para Recomendação', rota: '/portal' },
      { rotulo: 'Outras formas de escolher', proximo: 'modelos' },
      VOLTAR,
    ],
  },
  'modelos-todos': {
    texto: 'Em Modelos você filtra por categoria, motorização e preço, favorita os que gostar e compara até 3 lado a lado.',
    opcoes: [
      { rotulo: 'Ir para Modelos', rota: '/modelos' },
      { rotulo: 'Outras formas de escolher', proximo: 'modelos' },
      VOLTAR,
    ],
  },
  'modelos-ficha': {
    texto: 'No Dashboard, busque o nome do modelo para ver potência, velocidade máxima e câmbio de cada versão, e modelos semelhantes.',
    opcoes: [
      { rotulo: 'Ir para o Dashboard', rota: '/dashboard' },
      { rotulo: 'Outras formas de escolher', proximo: 'modelos' },
      VOLTAR,
    ],
  },

  agenda: {
    texto: 'O que você quer fazer?',
    opcoes: [
      { rotulo: 'Marcar um test-drive', proximo: 'agenda-testdrive' },
      { rotulo: 'Marcar revisão ou avaliação de usado', proximo: 'agenda-servico' },
      { rotulo: 'Remarcar ou cancelar', proximo: 'agenda-remarcar' },
      VOLTAR,
    ],
  },
  'agenda-testdrive': {
    texto: 'Em Agendamentos, escolha "Test-drive", a unidade, o modelo e o horário. Leve CNH válida e em dia.',
    opcoes: [
      { rotulo: 'Ir para Agendamentos', rota: '/agendamentos' },
      { rotulo: 'Outro agendamento', proximo: 'agenda' },
      VOLTAR,
    ],
  },
  'agenda-servico': {
    texto: 'Em Agendamentos, escolha "Revisão" ou "Avaliação de usado", a unidade e o horário. Leve o documento do veículo (e a CNH, na avaliação).',
    opcoes: [
      { rotulo: 'Ir para Agendamentos', rota: '/agendamentos' },
      { rotulo: 'Outro agendamento', proximo: 'agenda' },
      VOLTAR,
    ],
  },
  'agenda-remarcar': {
    texto: 'Em Agendamentos, na lista "Seus agendamentos", use os botões Remarcar ou Cancelar da visita.',
    opcoes: [
      { rotulo: 'Ir para Agendamentos', rota: '/agendamentos' },
      { rotulo: 'Outro agendamento', proximo: 'agenda' },
      VOLTAR,
    ],
  },

  ia: {
    texto: 'O que você quer saber sobre a nota de compatibilidade?',
    opcoes: [
      { rotulo: 'Como ela é calculada', proximo: 'ia-calculo' },
      { rotulo: 'Ela decide por mim?', proximo: 'ia-decide' },
      VOLTAR,
    ],
  },
  'ia-calculo': {
    texto: 'Procuramos no seu texto palavras de uso (família, estrada, cidade…) e o orçamento, e comparamos com as etiquetas de cada modelo. A página "Como a IA decide" mostra a conta passo a passo.',
    opcoes: [
      { rotulo: 'Ver Como a IA decide', rota: '/sobre-ia' },
      { rotulo: 'Outra dúvida sobre a nota', proximo: 'ia' },
      VOLTAR,
    ],
  },
  'ia-decide': {
    texto: 'Não. A nota só ordena as opções. Conforto e dirigibilidade só se confirmam no banco do carro, por isso vale fazer o test-drive.',
    opcoes: [
      { rotulo: 'Marcar um test-drive', proximo: 'agenda-testdrive' },
      { rotulo: 'Outra dúvida sobre a nota', proximo: 'ia' },
      VOLTAR,
    ],
  },

  humano: {
    texto: 'A Central de Relacionamento Ford atende de segunda a sexta, das 8h às 20h, pelo 0800-000-0000.',
    opcoes: [
      { rotulo: 'Ligar agora', tel: '08000000000' },
      VOLTAR,
    ],
  },
};

@Component({
  selector: 'app-fale-conosco',
  standalone: true,
  imports: [RouterLink, TopbarComponent, RodapeComponent, LinhasDeLuzComponent],
  templateUrl: './fale-conosco.component.html',
  styleUrl: './fale-conosco.component.css',
})
export class FaleConoscoComponent {
  protected readonly title = signal('meu-projeto');
  private router = inject(Router);
  private authService = inject(AuthService);

  /** Chat guiado da SEIA: a pessoa escolhe botões e a conversa segue o ROTEIRO. Não usa IA. */
  chatAberto = signal(false);
  chatDigitando = signal(false);
  passoAtual = signal('inicio');
  mensagens = signal<MensagemChat[]>([{ autor: 'seia', texto: ROTEIRO['inicio'].texto }]);
  opcoes = computed(() => ROTEIRO[this.passoAtual()].opcoes);

  @ViewChild('listaMensagens') private listaMensagens?: ElementRef<HTMLElement>;

  /** Telefones da Central de Relacionamento (mesmo número do passo "humano" do chat). */
  readonly telefones = [
    { numero: '0800 000 0000', tel: '08000000000', horario: 'Seg–Sex · 8h–20h' },
    { numero: '0800 000 0001', tel: '08000000001', horario: 'Seg–Sex · 8h–20h' },
  ];

  readonly icones = ICONES;

  readonly atalhos = [
    { rotulo: 'Agendar visita', rota: '/agendamentos', icone: 'agenda', tag: 'Agenda' },
    { rotulo: 'Ver modelos', rota: '/modelos', icone: 'carro', tag: 'Catálogo' },
    { rotulo: 'Como a IA decide', rota: '/sobre-ia', icone: 'cerebro', tag: 'IA' },
  ];

  abrirChatSeia(): void {
    this.chatAberto.set(true);
    this.rolarParaOFim();
  }

  /** Abre o chat já no assunto escolhido, como se a pessoa tivesse tocado no botão correspondente do início da conversa. */
  perguntar(rotulo: string, proximo: string): void {
    this.abrirChatSeia();
    this.escolher({ rotulo, proximo });
  }

  fecharChat(): void {
    this.chatAberto.set(false);
  }

  escolher(opcao: OpcaoChat): void {
    if (this.chatDigitando()) return;

    if (opcao.tel) {
      window.location.href = `tel:${opcao.tel}`;
      return;
    }
    if (opcao.rota) {
      this.fecharChat();
      this.router.navigateByUrl(opcao.rota);
      return;
    }
    if (!opcao.proximo) return;

    const proximo = opcao.proximo;
    this.mensagens.update((msgs) => [...msgs, { autor: 'usuario', texto: opcao.rotulo }]);
    this.chatDigitando.set(true);
    this.rolarParaOFim();

    setTimeout(() => {
      this.mensagens.update((msgs) => [...msgs, { autor: 'seia', texto: ROTEIRO[proximo].texto }]);
      this.passoAtual.set(proximo);
      this.chatDigitando.set(false);
      this.rolarParaOFim();
    }, 500);
  }

  private rolarParaOFim(): void {
    setTimeout(() => {
      const el = this.listaMensagens?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  onNavegar(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  irPerfil(): void {
    this.router.navigateByUrl('/perfil');
  }

  sair(): void {
    void this.authService.logout();
  }
}
