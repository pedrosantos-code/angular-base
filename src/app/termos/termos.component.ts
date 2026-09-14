import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'seia-termos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './termos.component.html',
  styleUrl: './termos.component.css',
})
export class TermosComponent {
  termoAtivo = 'termos-uso';
  compartilharConcessionarias = false;
  consentimentoTestDrive = true;
  termoAceito = false;

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