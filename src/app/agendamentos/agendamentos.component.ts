import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../topbar/topbar.component';

export interface TipoAtendimento { chave: string; rotulo: string; }

export interface Unidade {
  id: string;
  nome: string;
  endereco: string;
  distanciaKm: number;
  /** Quantas vagas a unidade tem no período carregado. */
  horariosLivres: number;
}

export interface ModeloDisponivel {
  nome: string;
  /** Nota de compatibilidade vinda da recomendação. Deixe nulo se a pessoa chegou sem recomendação. */
  nota: number | null;
  disponivel: boolean;
}

export type StatusDia = 'livre' | 'lotado' | 'fechado';

export interface Dia {
  /** ISO, usado como chave e no payload. */
  iso: string;
  semana: string;
  numero: string;
  vagas: number;
  status: StatusDia;
}

export interface Horario { hora: string; livre: boolean; }

export interface Agendamento {
  id: string;
  quando: string;
  titulo: string;
  unidade: string;
  detalhe: string;
  passado: boolean;
}

@Component({
  selector: 'seia-agendamentos',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './agendamentos.component.html',
  styleUrl: './agendamentos.component.css',
})
export class AgendamentosComponent {
  /** Dispare o carregamento da agenda da unidade escolhida. */
  @Output() carregarAgenda = new EventEmitter<{ unidadeId: string; tipo: string }>();
  /** Dispare o carregamento dos horários do dia escolhido. */
  @Output() carregarHorarios = new EventEmitter<{ unidadeId: string; dia: string }>();
  @Output() confirmar = new EventEmitter<{ tipo: string; unidadeId: string; modelo: string; dia: string; hora: string }>();
  @Output() remarcar = new EventEmitter<string>();
  @Output() cancelar = new EventEmitter<string>();
  @Output() navegar = new EventEmitter<string>();

  @Input() tipos: TipoAtendimento[] = [
    { chave: 'test-drive', rotulo: 'Test-drive' },
    { chave: 'revisao', rotulo: 'Revisão' },
    { chave: 'avaliacao', rotulo: 'Avaliação de usado' },
    { chave: 'comercial', rotulo: 'Atendimento comercial' },
  ];

  @Input() unidades: Unidade[] = [
    { id: 'morumbi', nome: 'Ford Morumbi', endereco: 'Av. Giovanni Gronchi, 5900', distanciaKm: 4.2, horariosLivres: 12 },
    { id: 'interlagos', nome: 'Ford Interlagos', endereco: 'Av. Interlagos, 3000', distanciaKm: 9.7, horariosLivres: 5 },
    { id: 'santo-amaro', nome: 'Ford Santo Amaro', endereco: 'Av. Santo Amaro, 1200', distanciaKm: 11.3, horariosLivres: 8 },
  ];

  @Input() modelo: ModeloDisponivel = { nome: 'Territory Titanium', nota: 94, disponivel: true };

  @Input() periodo = 'setembro 2026';

  @Input() dias: Dia[] = [
    { iso: '2026-09-15', semana: 'seg', numero: '15', vagas: 6, status: 'livre' },
    { iso: '2026-09-16', semana: 'ter', numero: '16', vagas: 4, status: 'livre' },
    { iso: '2026-09-17', semana: 'qua', numero: '17', vagas: 9, status: 'livre' },
    { iso: '2026-09-18', semana: 'qui', numero: '18', vagas: 0, status: 'lotado' },
    { iso: '2026-09-19', semana: 'sex', numero: '19', vagas: 3, status: 'livre' },
    { iso: '2026-09-20', semana: 'sáb', numero: '20', vagas: 7, status: 'livre' },
    { iso: '2026-09-21', semana: 'dom', numero: '21', vagas: 0, status: 'fechado' },
  ];

  @Input() horarios: Horario[] = [
    { hora: '09:00', livre: false }, { hora: '09:30', livre: true },
    { hora: '10:00', livre: false }, { hora: '10:30', livre: true },
    { hora: '11:00', livre: true }, { hora: '14:00', livre: false },
    { hora: '14:30', livre: true }, { hora: '16:00', livre: true },
  ];

  @Input() agendamentos: Agendamento[] = [
    { id: 'a1', quando: 'qui · 25/09 · 15:00', titulo: 'Revisão de 20.000 km', unidade: 'Ford Interlagos', detalhe: 'Av. Interlagos, 3000', passado: false },
    { id: 'a2', quando: 'sex · 29/08 · 11:00', titulo: 'Test-drive Bronco Sport', unidade: 'Ford Morumbi', detalhe: 'compareceu', passado: true },
  ];

  /** Requisitos exibidos antes da confirmação, por tipo de atendimento. */
  @Input() requisitos: Record<string, string> = {
    'test-drive': 'leve CNH válida e em dia',
    revisao: 'leve o documento do veículo',
    avaliacao: 'leve documento do veículo e CNH',
    comercial: 'sem requisitos',
  };

  tipo = 'test-drive';
  unidadeId = 'morumbi';
  dia: string | null = '2026-09-16';
  hora: string | null = '10:30';

  get unidade(): Unidade | undefined {
    return this.unidades.find((u) => u.id === this.unidadeId);
  }

  get diaEscolhido(): Dia | undefined {
    return this.dias.find((d) => d.iso === this.dia);
  }

  get tipoRotulo(): string {
    return this.tipos.find((t) => t.chave === this.tipo)?.rotulo ?? '';
  }

  get completo(): boolean {
    return !!(this.tipo && this.unidadeId && this.dia && this.hora);
  }

  /** Só test-drive e avaliação dependem de um modelo específico. */
  get exigeModelo(): boolean {
    return this.tipo === 'test-drive' || this.tipo === 'avaliacao';
  }

  escolherTipo(chave: string): void {
    this.tipo = chave;
    this.limparQuando();
    this.carregarAgenda.emit({ unidadeId: this.unidadeId, tipo: chave });
  }

  escolherUnidade(id: string): void {
    this.unidadeId = id;
    this.limparQuando();
    this.carregarAgenda.emit({ unidadeId: id, tipo: this.tipo });
  }

  escolherDia(d: Dia): void {
    if (d.status !== 'livre') return;
    this.dia = d.iso;
    this.hora = null;
    this.carregarHorarios.emit({ unidadeId: this.unidadeId, dia: d.iso });
  }

  escolherHora(h: Horario): void {
    if (!h.livre) return;
    this.hora = h.hora;
  }

  private limparQuando(): void {
    this.dia = null;
    this.hora = null;
  }

  enviar(): void {
    if (!this.completo) return;
    this.confirmar.emit({
      tipo: this.tipo,
      unidadeId: this.unidadeId,
      modelo: this.exigeModelo ? this.modelo.nome : '',
      dia: this.dia!,
      hora: this.hora!,
    });
  }
}