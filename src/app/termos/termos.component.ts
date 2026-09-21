import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { AuthService } from '../auth.service';

export interface Termo {
  chave: string;
  nome: string;
  versao: string;
  obrigatorio: boolean;
  aceito: boolean;
  aceitoEm: string | null;
}

/** Uma alteração da versão, com o trecho que mudou em destaque ("antes [destaque] depois"). */
export interface Mudanca {
  antes: string;
  destaque: string;
  depois: string;
}

/** O texto de um documento, em quatro blocos: 1 Objeto, 2 O que mudou, 3 Você concorda com, 4 Aceite. */
export interface ConteudoDocumento {
  termo: Termo;
  /** Linha de contexto abaixo do título ("Primeira versão, sem atualizações"). */
  contexto: string;
  objeto: string;
  mudancas: Mudanca[];
  /** Mostrado no lugar das alterações quando a versão não mudou nada. */
  semMudancas: string;
  itens: string[];
}

export interface VersaoHistorico {
  versao: string;
  atual: boolean;
  detalhe: string;
}

@Component({
  selector: 'seia-termos',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, RodapeComponent],
  templateUrl: './termos.component.html',
  styleUrl: './termos.component.css',
})
export class TermosComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  ir(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    void this.authService.logout();
  }

  compartilharConcessionarias = false;
  compartilharConcessionariasDesde: string | null = null;

  consentimentoTestDrive = true;
  consentimentoTestDriveDesde: string | null = '02/04/2026';

  termoAtivo = 'termos-uso';

  /** Marca a caixa "li e aceito" antes de confirmar — só vale para o termo ainda pendente. */
  termoAceito = false;

  /** Destaca no texto o que mudou nesta versão (o interruptor "Mostrar alterações"). */
  mostrarAlteracoes = true;

  readonly termosUso: Termo = {
    chave: 'termos-uso',
    nome: 'Termos de Uso da Plataforma',
    versao: 'v1.0',
    obrigatorio: true,
    aceito: false,
    aceitoEm: null,
  };

  readonly privacidade: Termo = {
    chave: 'privacidade',
    nome: 'Política de Privacidade e Cookies',
    versao: 'v1.0',
    obrigatorio: true,
    aceito: true,
    aceitoEm: '02/04/2026',
  };

  readonly termos: Termo[] = [this.termosUso, this.privacidade];

  readonly conteudos: Record<string, ConteudoDocumento> = {
    'termos-uso': {
      termo: this.termosUso,
      contexto: 'Primeira versão, ainda sem atualizações',
      objeto: 'Ao usar o SEIA + Ford você concorda em seguir as diretrizes de navegação, privacidade e segurança da plataforma.',
      mudancas: [],
      semMudancas: 'Esta é a primeira versão dos Termos de Uso, ainda sem atualizações. Quando houver mudanças, elas aparecem aqui, destacadas.',
      itens: [
        'Manter suas credenciais de acesso seguras.',
        'Usar os serviços da plataforma de forma adequada.',
        'A coleta de dados necessária para personalizar o atendimento.',
      ],
    },
    privacidade: {
      termo: this.privacidade,
      contexto: 'Aceita por você em 02/04/2026',
      objeto:
        'Esta política detalha como coletamos, usamos e protegemos seus dados pessoais durante a sua experiência com a inteligência artificial da Ford.',
      mudancas: [],
      semMudancas: 'Esta é a primeira versão da política, ainda sem atualizações. Quando houver mudanças, elas aparecem aqui, destacadas.',
      itens: [
        'Guardar no seu navegador a sessão de login e as suas preferências (perfil, favoritos e comparações).',
        'Usar o que você informa (uso, orçamento, rodagem e prioridades) só para calcular as recomendações.',
        'Compartilhar suas preferências com concessionárias apenas se você ligar essa opção ao lado.',
      ],
    },
  };

  private readonly chaveArmazenamento = 'seia-termos-aceites';

  constructor() {
    try {
      const salvo = localStorage.getItem(this.chaveArmazenamento);
      const aceitoEm = salvo ? (JSON.parse(salvo)[this.termosUso.chave] as string | undefined) : undefined;
      if (aceitoEm) {
        this.termosUso.aceito = true;
        this.termosUso.aceitoEm = aceitoEm;
      }
    } catch {
      // localStorage indisponível (modo privado, etc.) — segue com o padrão pendente.
    }
  }

  /** O documento que está aberto. */
  get doc(): ConteudoDocumento {
    return this.conteudos[this.termoAtivo] ?? this.conteudos['termos-uso'];
  }

  get pendentes(): Termo[] {
    return this.termos.filter((t) => t.obrigatorio && !t.aceito);
  }

  get obrigatoriosAceitos(): number {
    return this.termos.filter((t) => t.obrigatorio && t.aceito).length;
  }

  get totalObrigatorios(): number {
    return this.termos.filter((t) => t.obrigatorio).length;
  }

  /** Quanto dos documentos obrigatórios já foi aceito, em %: alimenta o anel de progresso. */
  get percentualAceito(): number {
    return this.totalObrigatorios ? Math.round((this.obrigatoriosAceitos / this.totalObrigatorios) * 100) : 0;
  }

  /** Data do aceite mais recente (só faz sentido quando não há pendência). */
  get dataDoCarimbo(): string | null {
    const datas = this.termos.map((t) => t.aceitoEm).filter((d): d is string => !!d);
    if (datas.length === 0) return null;
    const valor = (d: string) => d.split('/').reverse().join('');
    return [...datas].sort((a, b) => valor(b).localeCompare(valor(a)))[0];
  }

  /** Histórico de versões dos Termos de Uso, da mais nova para a mais antiga (por enquanto só a 1.0). */
  get historico(): VersaoHistorico[] {
    return [
      {
        versao: 'Versão 1.0',
        atual: true,
        detalhe: `Primeira versão, publicada em 15/05/2026 · ${this.termosUso.aceito ? 'aceita em ' + this.termosUso.aceitoEm : 'aguardando o seu aceite'}`,
      },
    ];
  }

  selecionarTermo(chave: string): void {
    this.termoAtivo = chave;
  }

  alternarCompartilhar(ligado: boolean): void {
    this.compartilharConcessionariasDesde = ligado ? new Date().toLocaleDateString('pt-BR') : null;
  }

  alternarConsentimentoTestDrive(ligado: boolean): void {
    this.consentimentoTestDriveDesde = ligado ? new Date().toLocaleDateString('pt-BR') : null;
  }

  baixarPdf(): void {
    window.print();
  }

  continuar(): void {
    if (this.termosUso.aceito) {
      this.router.navigateByUrl('/portal');
      return;
    }
    if (!this.termoAceito) return;

    this.termosUso.aceito = true;
    this.termosUso.aceitoEm = new Date().toLocaleDateString('pt-BR');

    try {
      const salvo = localStorage.getItem(this.chaveArmazenamento);
      const mapa = salvo ? JSON.parse(salvo) : {};
      mapa[this.termosUso.chave] = this.termosUso.aceitoEm;
      localStorage.setItem(this.chaveArmazenamento, JSON.stringify(mapa));
    } catch {
      // localStorage indisponível — o aceite vale só para esta sessão.
    }

    this.router.navigateByUrl('/portal');
  }
}
