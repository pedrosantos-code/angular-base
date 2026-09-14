import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';

@Component({
  selector: 'seia-termos',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './termos.component.html',
  styleUrl: './termos.component.css',
})
export class TermosComponent {
  private router = inject(Router);

  ir(chave: string): void {
    this.navegar.emit(chave);
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    this.router.navigateByUrl('/');
  }

  termoAtivo = 'termos-uso';
  compartilharConcessionarias = false;
  consentimentoTestDrive = true;
  termoAceito = false;

  @Output() navegar = new EventEmitter<string>();
  @Output() aceitoEContinuar = new EventEmitter<void>();
  @Output() baixarPdfSolicitado = new EventEmitter<void>();

  selecionarTermo(chave: string): void {
    this.termoAtivo = chave;
  }

  baixarPdf(): void {
    this.baixarPdfSolicitado.emit();
  }

  continuar(): void {
    if (this.termoAceito) {
      this.aceitoEContinuar.emit();
    }
  }
}