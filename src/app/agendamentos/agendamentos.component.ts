import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU, ICONES } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { LinhasDeLuzComponent } from '../shared/linhas-de-luz.component';
import { AuthService } from '../auth.service';
import { fotoDoModelo } from '../shared/fotos-modelos';
import { lerModeloRecomendado } from '../shared/modelo-recomendado';

export interface TipoAtendimento {
  chave: string;
  rotulo: string;
  /** Chave do ícone em ICONES (o mesmo conjunto do menu). */
  icone: string;
}

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
  /** true quando o modelo veio do perfil salvo da pessoa (o carro em primeiro lugar); false para o modelo padrão. */
  doPerfil: boolean;
  /** Quanto do preço o orçamento da pessoa cobre (0 a 100). Nulo quando ela não informou orçamento. */
  cobertura: number | null;
  disponivel: boolean;
  /** Rótulo curto acima do nome ("SUV médio"). */
  segmento?: string;
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
  imports: [CommonModule, TopbarComponent, RodapeComponent, LinhasDeLuzComponent],
  templateUrl: './agendamentos.component.html',
  styleUrl: './agendamentos.component.css',
  host: { class: 'seia-pagina' },
})
export class AgendamentosComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  /** Meia-noite do dia atual. Reavaliado a cada minuto para o calendário virar sozinho quando o dia muda. */
  private readonly hoje = signal(AgendamentosComponent.meiaNoite(new Date()));

  constructor() {
    const id = setInterval(() => {
      const agora = AgendamentosComponent.meiaNoite(new Date());
      if (agora.getTime() !== this.hoje().getTime()) this.hoje.set(agora);
    }, 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));

    // Com ?unidade=<id> na URL, já deixa a unidade escolhida.
    const unidadeDaUrl = this.route.snapshot.queryParamMap.get('unidade');
    if (unidadeDaUrl && this.unidades.some((u) => u.id === unidadeDaUrl)) this.unidadeId = unidadeDaUrl;

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
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    void this.authService.logout();
  }

  /** Dispare o carregamento da agenda da unidade escolhida. */
  /** Dispare o carregamento dos horários do dia escolhido. */

  readonly icones = ICONES;

  tipos: TipoAtendimento[] = [
    { chave: 'test-drive', rotulo: 'Test-drive', icone: 'carro' },
    { chave: 'revisao', rotulo: 'Revisão', icone: 'config' },
    { chave: 'avaliacao', rotulo: 'Avaliação de usado', icone: 'grafico' },
    { chave: 'comercial', rotulo: 'Atendimento comercial', icone: 'telefone' },
  ];

  /** Unidades disponíveis para agendamento. */
  unidades: Unidade[] = [
    { id: 'caoa-ibirapuera', nome: 'Ford Caoa - Ibirapuera - SP', endereco: 'Av. Ibirapuera, 2400', distanciaKm: 3.5, horariosLivres: 12 },
    { id: 'caoa-jabaquara', nome: 'Ford CAOA - Jabaquara - SP', endereco: 'Av. Jabaquara, 2207', distanciaKm: 6.8, horariosLivres: 8 },
    { id: 'caoa-ceasa', nome: 'Ford CAOA - Ceasa - SP', endereco: 'Av. Dr. Gastão Vidigal, 1250', distanciaKm: 9.4, horariosLivres: 5 },
    { id: 'sonnervig', nome: 'Ford Sonnervig - SP', endereco: 'Rua dos Machados, 150', distanciaKm: 12.1, horariosLivres: 9 },
    { id: 'ford-sao-paulo', nome: 'Ford For São Paulo - SP', endereco: 'Av. das Nações Unidas, 21883', distanciaKm: 15.6, horariosLivres: 3 },
  ];

  /**
   * O carro em primeiro lugar do último "Salvar perfil". Sem perfil salvo, fica um modelo padrão, sem porcentagem
   * e sem o rótulo "vindo do seu perfil" (não há recomendação de verdade por trás dele).
   */
  modelo: ModeloDisponivel = this.modeloInicial();

  private modeloInicial(): ModeloDisponivel {
    const salvo = lerModeloRecomendado();
    if (salvo) return { nome: salvo.nome, segmento: salvo.segmento || undefined, cobertura: salvo.cobertura, doPerfil: true, disponivel: true };
    return { nome: 'Territory Titanium', segmento: 'SUV médio', cobertura: null, doPerfil: false, disponivel: true };
  }

  /** Foto do modelo: procura pelo nome completo e, se não achar, pela primeira palavra ("Territory Titanium" → "Territory"). */
  get fotoModelo(): string | null {
    return fotoDoModelo(this.modelo.nome) ?? fotoDoModelo(this.modelo.nome.split(' ')[0]);
  }

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

  /** Cabeçalho do calendário: a semana começa na segunda-feira. */
  readonly semanaCabecalho = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

  /** Células vazias antes do primeiro dia, para cada data cair na coluna do seu dia da semana. */
  get vazios(): number[] {
    return Array.from({ length: (this.hoje().getDay() + 6) % 7 });
  }

  /** "seg, 21" quando há dia escolhido (mostrado no resumo). */
  get dataResumo(): string | null {
    const d = this.diaEscolhido;
    return d ? `${d.semana}, ${d.numero}` : null;
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

  horarios: Horario[] = [
    { hora: '09:00', livre: false }, { hora: '09:30', livre: true },
    { hora: '10:00', livre: false }, { hora: '10:30', livre: true },
    { hora: '11:00', livre: true }, { hora: '14:00', livre: false },
    { hora: '14:30', livre: true }, { hora: '16:00', livre: true },
  ];

  /** Começa vazio de propósito — só aparece agendamento aqui depois de confirmar um pelo formulário. */
  agendamentos: Agendamento[] = [];

  private readonly chaveAgendamentos = 'seia-agendamentos';

  /** Requisitos exibidos antes da confirmação, por tipo de atendimento. */
  requisitos: Record<string, string> = {
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
  }

  escolherUnidade(id: string): void {
    this.unidadeId = id;
    this.limparQuando();
  }

  escolherDia(d: Dia): void {
    if (d.status !== 'livre') return;
    this.dia = d.iso;
    this.hora = null;
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


    this.limparQuando();
  }

  /** Remove um agendamento errado/indesejado da lista, com confirmação para evitar clique acidental. */
  excluirAgendamento(a: Agendamento): void {
    if (!confirm(`Cancelar "${a.titulo}" em ${a.quando}?`)) return;
    this.agendamentos = this.agendamentos.filter((item) => item.id !== a.id);
    this.salvarAgendamentos();
  }

  /** Libera o horário atual e leva a pessoa de volta ao formulário para escolher outro. */
  remarcar(a: Agendamento): void {
    if (!confirm(`Remarcar "${a.titulo}"? O horário atual será liberado e você poderá escolher outro.`)) return;
    this.agendamentos = this.agendamentos.filter((item) => item.id !== a.id);
    this.salvarAgendamentos();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  verComparacao(): void {
    this.router.navigate(['/modelos'], { queryParams: { ultimaComparacao: '1' } });
  }

  private salvarAgendamentos(): void {
    try {
      localStorage.setItem(this.chaveAgendamentos, JSON.stringify(this.agendamentos));
    } catch {
      // localStorage indisponível — o agendamento vale só para esta sessão.
    }
  }
}