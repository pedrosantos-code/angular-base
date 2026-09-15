import { Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';

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
  imports: [CommonModule, TopbarComponent, RodapeComponent],
  templateUrl: './agendamentos.component.html',
  styleUrl: './agendamentos.component.css',
})
export class AgendamentosComponent {
  private router = inject(Router);

  /** Meia-noite do dia atual. Reavaliado a cada minuto para o calendário virar sozinho quando o dia muda. */
  private readonly hoje = signal(AgendamentosComponent.meiaNoite(new Date()));

  constructor() {
    const id = setInterval(() => {
      const agora = AgendamentosComponent.meiaNoite(new Date());
      if (agora.getTime() !== this.hoje().getTime()) this.hoje.set(agora);
    }, 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));

    try {
      const salvo = localStorage.getItem(this.chaveAgendamentos);
      if (salvo) this.agendamentos = JSON.parse(salvo);
    } catch {
      // localStorage indisponível — a lista fica vazia até um novo agendamento nesta sessão.
    }
  }

  private static meiaNoite(d: Date): Date {
    const copia = new Date(d);
    copia.setHours(0, 0, 0, 0);
    return copia;
  }

  ir(chave: string): void {
    this.navegar.emit(chave);
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    this.router.navigateByUrl('/');
  }

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

  /** Mesmas unidades cadastradas em /concessionarias (mesmo id, nome e endereço) — veja ConcessionariasComponent.unidades. */
  @Input() unidades: Unidade[] = [
    { id: 'caoa-ibirapuera', nome: 'Ford Caoa - Ibirapuera', endereco: 'Av. Ibirapuera, 2400', distanciaKm: 3.5, horariosLivres: 12 },
    { id: 'caoa-jabaquara', nome: 'Ford CAOA - Jabaquara', endereco: 'Av. Jabaquara, 2207', distanciaKm: 6.8, horariosLivres: 8 },
    { id: 'caoa-ceasa', nome: 'Ford CAOA - Ceasa', endereco: 'Av. Dr. Gastão Vidigal, 1250', distanciaKm: 9.4, horariosLivres: 5 },
    { id: 'sonnervig', nome: 'Ford Sonnervig', endereco: 'Rua dos Machados, 150', distanciaKm: 12.1, horariosLivres: 9 },
    { id: 'ford-sao-paulo', nome: 'Ford For São Paulo', endereco: 'Av. das Nações Unidas, 21883', distanciaKm: 15.6, horariosLivres: 3 },
  ];

  @Input() modelo: ModeloDisponivel = { nome: 'Territory Titanium', nota: 94, disponivel: true };

  /** Quantidade de dias exibidos, sempre a partir de hoje — 4 semanas fecham exatamente as linhas da grade de 7 colunas. */
  private readonly janelaDias = 28;

  /** Texto do período (ex.: "15 set – 12 out"), calculado a partir de hoje — nunca fica com uma data parada no passado. */
  get periodo(): string {
    const inicio = this.hoje();
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + this.janelaDias - 1);
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
    return `${fmt(inicio)} – ${fmt(fim)}`;
  }

  /** Calendário rolante de hoje até 4 semanas à frente. Domingo fecha; o resto varia de forma determinística (mock). */
  get dias(): Dia[] {
    const nomesSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const inicio = this.hoje();
    const dias: Dia[] = [];

    for (let i = 0; i < this.janelaDias; i++) {
      const data = new Date(inicio);
      data.setDate(data.getDate() + i);
      const diaSemana = data.getDay();

      let status: StatusDia;
      let vagas: number;
      if (diaSemana === 0) {
        status = 'fechado';
        vagas = 0;
      } else if ((data.getDate() + diaSemana) % 6 === 0) {
        status = 'lotado';
        vagas = 0;
      } else {
        status = 'livre';
        vagas = 2 + ((data.getDate() * 3 + diaSemana) % 8);
      }

      const iso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
      dias.push({
        iso,
        semana: nomesSemana[diaSemana],
        numero: String(data.getDate()).padStart(2, '0'),
        vagas,
        status,
      });
    }

    return dias;
  }

  @Input() horarios: Horario[] = [
    { hora: '09:00', livre: false }, { hora: '09:30', livre: true },
    { hora: '10:00', livre: false }, { hora: '10:30', livre: true },
    { hora: '11:00', livre: true }, { hora: '14:00', livre: false },
    { hora: '14:30', livre: true }, { hora: '16:00', livre: true },
  ];

  /** Começa vazio de propósito — só aparece agendamento aqui depois de confirmar um pelo formulário. */
  @Input() agendamentos: Agendamento[] = [];

  private readonly chaveAgendamentos = 'seia-agendamentos';

  /** Requisitos exibidos antes da confirmação, por tipo de atendimento. */
  @Input() requisitos: Record<string, string> = {
    'test-drive': 'leve CNH válida e em dia',
    revisao: 'leve o documento do veículo',
    avaliacao: 'leve documento do veículo e CNH',
    comercial: 'sem requisitos',
  };

  tipo = 'test-drive';
  unidadeId = 'caoa-ibirapuera';
  dia: string | null = null;
  hora: string | null = null;

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

    const dia = this.diaEscolhido!;
    const titulo = this.exigeModelo ? `${this.tipoRotulo} · ${this.modelo.nome}` : this.tipoRotulo;
    const novo: Agendamento = {
      id: `a-${Date.now()}`,
      quando: `${dia.semana} · ${dia.iso.slice(8, 10)}/${dia.iso.slice(5, 7)} · ${this.hora}`,
      titulo,
      unidade: this.unidade?.nome ?? '',
      detalhe: this.unidade?.endereco ?? '',
      passado: false,
    };

    this.agendamentos = [novo, ...this.agendamentos];
    this.salvarAgendamentos();

    this.confirmar.emit({
      tipo: this.tipo,
      unidadeId: this.unidadeId,
      modelo: this.exigeModelo ? this.modelo.nome : '',
      dia: this.dia!,
      hora: this.hora!,
    });

    this.limparQuando();
  }

  /** Remove um agendamento errado/indesejado da lista, com confirmação para evitar clique acidental. */
  excluirAgendamento(a: Agendamento): void {
    if (!confirm(`Cancelar "${a.titulo}" em ${a.quando}?`)) return;
    this.agendamentos = this.agendamentos.filter((item) => item.id !== a.id);
    this.salvarAgendamentos();
    this.cancelar.emit(a.id);
  }

  private salvarAgendamentos(): void {
    try {
      localStorage.setItem(this.chaveAgendamentos, JSON.stringify(this.agendamentos));
    } catch {
      // localStorage indisponível — o agendamento vale só para esta sessão.
    }
  }
}