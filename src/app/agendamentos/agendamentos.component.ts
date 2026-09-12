import { Component, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Agendamento {
  id: number;
  titulo: string;
  dataHora: string;
}

interface DiaCalendario {
  dia: number;
  mes: number;
  ano: number;
  atual: boolean;
  passado: boolean;
  selecionado: boolean;
}

@Component({
  selector: 'app-agendamentos',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './agendamentos.component.html',
  styleUrl: './agendamentos.component.css',
})
export class AgendamentosComponent {
  protected readonly title = signal('meu-projeto');

  menuAberto = signal<string | null>(null);
  sidebarAberta = signal<boolean>(false);
  mensagemSucesso = signal<string | null>(null);

  private readonly nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  private dataAtualObj = new Date();
  mesAtual = signal<number>(this.dataAtualObj.getMonth());
  anoAtual = signal<number>(this.dataAtualObj.getFullYear());

  diaSelecionado = signal<{ dia: number, mes: number, ano: number } | null>({
    dia: this.dataAtualObj.getDate(),
    mes: this.dataAtualObj.getMonth(),
    ano: this.dataAtualObj.getFullYear()
  });

  // Campos do formulário de agendamento
  tipoSelecionado = signal<string>('Test-Drive');
  veiculoSelecionado = signal<string>('Ford Ranger');
  horarioSelecionado = signal<string>('10:00');

  // Inicializa carregando do localStorage ou usando os dados padrão
  agendamentos = signal<Agendamento[]>(this.carregarAgendamentosIniciais());

  private carregarAgendamentosIniciais(): Agendamento[] {
    const salvo = localStorage.getItem('meus_agendamentos_ford');
    if (salvo) {
      try {
        return JSON.parse(salvo);
      } catch (e) {
        console.error('Erro ao ler agendamentos salvos', e);
      }
    }
    // Dados padrão caso o armazenamento esteja vazio
    return [
      { id: 1, titulo: 'Test-Drive: Ford Ranger', dataHora: '15/10/2026 10:00' },
      { id: 2, titulo: 'Visita à Concessionária', dataHora: '18/10/2026 15:30' }
    ];
  }

  private salvarNoStorage(lista: Agendamento[]): void {
    localStorage.setItem('meus_agendamentos_ford', JSON.stringify(lista));
  }

  mesAnoFormatado = computed(() => {
    return `${this.nomesMeses[this.mesAtual()]} ${this.anoAtual()}`;
  });

  podeVoltarMes = computed(() => {
    const hoje = new Date();
    if (this.anoAtual() > hoje.getFullYear()) return true;
    if (this.anoAtual() === hoje.getFullYear() && this.mesAtual() > hoje.getMonth()) return true;
    return false;
  });

  podeVoltarAno = computed(() => {
    const hoje = new Date();
    return this.anoAtual() > hoje.getFullYear();
  });

  diasDoMes = computed(() => {
    const ano = this.anoAtual();
    const mes = this.mesAtual();
    const listaDias: DiaCalendario[] = [];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);

    let diaSemanaInicio = primeiroDia.getDay() - 1;
    if (diaSemanaInicio === -1) diaSemanaInicio = 6;

    const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const d = ultimoDiaMesAnterior - i;
      const mAnt = mes === 0 ? 11 : mes - 1;
      const aAnt = mes === 0 ? ano - 1 : ano;
      
      const dataIterada = new Date(aAnt, mAnt, d);
      dataIterada.setHours(0, 0, 0, 0);

      listaDias.push({
        dia: d,
        mes: mAnt,
        ano: aAnt,
        atual: false,
        passado: dataIterada < hoje,
        selecionado: this.isSelecionado(d, mAnt, aAnt)
      });
    }

    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      const dataIterada = new Date(ano, mes, i);
      dataIterada.setHours(0, 0, 0, 0);

      listaDias.push({
        dia: i,
        mes: mes,
        ano: ano,
        atual: true,
        passado: dataIterada < hoje,
        selecionado: this.isSelecionado(i, mes, ano)
      });
    }

    const totalCelulas = listaDias.length <= 35 ? 35 : 42;
    const diasRestantes = totalCelulas - listaDias.length;
    for (let i = 1; i <= diasRestantes; i++) {
      const mProx = mes === 11 ? 0 : mes + 1;
      const aProx = mes === 11 ? ano + 1 : ano;
      
      const dataIterada = new Date(aProx, mProx, i);
      dataIterada.setHours(0, 0, 0, 0);

      listaDias.push({
        dia: i,
        mes: mProx,
        ano: aProx,
        atual: false,
        passado: dataIterada < hoje,
        selecionado: this.isSelecionado(i, mProx, aProx)
      });
    }

    return listaDias;
  });

  isSelecionado(dia: number, mes: number, ano: number): boolean {
    const sel = this.diaSelecionado();
    return sel !== null && sel.dia === dia && sel.mes === mes && sel.ano === ano;
  }

  selecionarDia(d: DiaCalendario): void {
    if (d.passado) return;
    
    this.diaSelecionado.set({ dia: d.dia, mes: d.mes, ano: d.ano });
    if (!d.atual) {
      this.mesAtual.set(d.mes);
      this.anoAtual.set(d.ano);
    }
  }

  mudarMes(direcao: number): void {
    if (direcao < 0 && !this.podeVoltarMes()) return;

    let novoMes = this.mesAtual() + direcao;
    let novoAno = this.anoAtual();

    if (novoMes > 11) {
      novoMes = 0;
      novoAno++;
    } else if (novoMes < 0) {
      novoMes = 11;
      novoAno--;
    }

    this.mesAtual.set(novoMes);
    this.anoAtual.set(novoAno);
  }

  mudarAno(direcao: number): void {
    if (direcao < 0 && !this.podeVoltarAno()) return;
    this.anoAtual.update(a => a + direcao);
  }

  irParaMesAtual(): void {
    const hoje = new Date();
    this.mesAtual.set(hoje.getMonth());
    this.anoAtual.set(hoje.getFullYear());
    this.diaSelecionado.set({ dia: hoje.getDate(), mes: hoje.getMonth(), ano: hoje.getFullYear() });
  }

  adicionarAgendamento(): void {
    const sel = this.diaSelecionado();
    if (!sel) return;

    const hora = this.horarioSelecionado() || '10:00';
    
    if (hora < '08:00' || hora > '20:00') {
      alert('Por favor, escolha um horário entre 08:00 e 20:00 (horário de funcionamento).');
      return;
    }

    const dataBase = `${String(sel.dia).padStart(2, '0')}/${String(sel.mes + 1).padStart(2, '0')}/${sel.ano}`;
    const tipo = this.tipoSelecionado();
    
    let tituloFinal = '';
    if (tipo === 'Test-Drive' || tipo === 'Retirada de Veículo Novo') {
      tituloFinal = `${tipo}: ${this.veiculoSelecionado()}`;
    } else {
      tituloFinal = `${tipo}`;
    }

    const novoItem: Agendamento = {
      id: Date.now(),
      titulo: tituloFinal,
      dataHora: `${dataBase} ${hora}`
    };

    this.agendamentos.update(lista => {
      const novaLista = [novoItem, ...lista];
      this.salvarNoStorage(novaLista);
      return novaLista;
    });

    this.mensagemSucesso.set('Agendamento realizado com sucesso!');
    setTimeout(() => {
      this.mensagemSucesso.set(null);
    }, 4000);
  }

  excluirAgendamento(id: number): void {
    this.agendamentos.update(lista => {
      const novaLista = lista.filter(item => item.id !== id);
      this.salvarNoStorage(novaLista); // Salva a remoção permanentemente
      return novaLista;
    });
  }

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

  abrirSidebar(): void {
    this.sidebarAberta.set(true);
    this.fecharMenus();
  }

  fecharSidebar(): void {
    this.sidebarAberta.set(false);
  }
}