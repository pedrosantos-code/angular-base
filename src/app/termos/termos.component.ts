import { Component, EventEmitter, Output, inject } from '@angular/core';
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
    this.navegar.emit(chave);
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    void this.authService.logout();
  }

  @Output() navegar = new EventEmitter<string>();
  @Output() aceitoEContinuar = new EventEmitter<void>();
  @Output() baixarPdfSolicitado = new EventEmitter<void>();

  compartilharConcessionarias = false;
  compartilharConcessionariasDesde: string | null = null;

  consentimentoTestDrive = true;
  consentimentoTestDriveDesde: string | null = '02/04/2026';

  termoAtivo = 'termos-uso';

  /** Marca a caixa "li e aceito" antes de confirmar — só vale para o termo ainda pendente. */
  termoAceito = false;

  readonly termosUso: Termo = {
    chave: 'termos-uso',
    nome: 'Termos de Uso da Plataforma',
    versao: 'v3.1',
    obrigatorio: true,
    aceito: false,
    aceitoEm: null,
  };

  readonly privacidade: Termo = {
    chave: 'privacidade',
    nome: 'Política de Privacidade e Cookies',
    versao: 'v2.4',
    obrigatorio: true,
    aceito: true,
    aceitoEm: '02/04/2026',
  };

  readonly termos: Termo[] = [this.termosUso, this.privacidade];

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

  get pendentes(): Termo[] {
    return this.termos.filter((t) => t.obrigatorio && !t.aceito);
  }

  get obrigatoriosAceitos(): number {
    return this.termos.filter((t) => t.obrigatorio && t.aceito).length;
  }

  get totalObrigatorios(): number {
    return this.termos.filter((t) => t.obrigatorio).length;
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
    this.baixarPdfSolicitado.emit();
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

    this.aceitoEContinuar.emit();
    this.router.navigateByUrl('/portal');
  }
}
