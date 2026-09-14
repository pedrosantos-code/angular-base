import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ItemMenu {
  chave: string;
  rotulo: string;
  icone: string;
}

export interface ModeloFord {
  segmento: string;
  nome: string;
  preco: string;
}

export interface AtalhoBusca {
  chave: string;
  rotulo: string;
  icone: string[];
}

export interface ResultadoIA {
  modelo: string;
  motivo: string;
  nota: number;
}

export interface PassoFuncionamento {
  n: string;
  titulo: string;
  texto: string;
}

/** Ícones em SVG inline — sem depender de fonte externa. */
export const ICONES: Record<string, string[]> = {
  menu: ['M4 7h16M4 12h16M4 17h16'],
  perfil: [
    'M12 12.6a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4z',
    'M5.3 19.8a6.9 6.9 0 0 1 13.4 0',
  ],
  config: [
    'M6 4v6.2M6 14.2V20M12 4v9.2M12 17.2V20M18 4v2.2M18 10.2V20',
    'M6 12.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 15.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 8.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  ],
  sair: [
    'M10 20H6.5A2.5 2.5 0 0 1 4 17.5v-11A2.5 2.5 0 0 1 6.5 4H10',
    'M15.5 16 20 12l-4.5-4M20 12H9.5',
  ],
  ia: ['M12 3.2l2 4.8 4.8 2-4.8 2-2 4.8-2-4.8-4.8-2 4.8-2z'],
  carro: ['M5 17h14M4.5 17v-4.2L6.4 8h11.2l1.9 4.8V17M5 17v2M19 17v2', 'M8 13h.01M16 13h.01'],
  grafico: ['M4 20V10.5M10 20V4.5M16 20v-6.5M3 20h18'],
  agenda: ['M4 5.5h16v15H4zM4 10h16M8.5 3v4.5M15.5 3v4.5'],
  local: ['M12 21.5s6.8-6 6.8-11.5a6.8 6.8 0 1 0-13.6 0C5.2 15.5 12 21.5 12 21.5z', 'M12 7.2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],
  telefone: ['M20.8 16.9v2.4a2 2 0 0 1-2.2 2 19.4 19.4 0 0 1-8.4-3 19 19 0 0 1-5.8-5.8 19.4 19.4 0 0 1-3-8.5A2 2 0 0 1 3.4 2h2.5a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.7a2 2 0 0 1-.5 2.1L7 9.7a15.8 15.8 0 0 0 5.9 5.9l1.2-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z'],
  cerebro: ['M9.5 21h5M10.2 18.2h3.6', 'M12 3a6 6 0 0 1 3.8 10.6v1.9H8.2v-1.9A6 6 0 0 1 12 3z'],
  documento: ['M7 3.5h6.8L19 8.6V20.5H7z', 'M13.8 3.5v5.1H19M10 13.5h6M10 17h6'],
};

@Component({
  selector: 'seia-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.css',
})
export class PortalComponent {
  @Input() ativo = 'recomendacao';

  /** Termo digitado na caixa de busca (vinculado via ngModel) */
  termo = '';

  /** Nota de corte para cor da barra de progresso */
  readonly corteFraco = 60;

  @Output() navegar = new EventEmitter<string>();
  @Output() abrirPerfil = new EventEmitter<void>();
  @Output() abrirConfiguracoes = new EventEmitter<void>();
  @Output() sair = new EventEmitter<void>();
  @Output() modeloSelecionado = new EventEmitter<string>();
  @Output() buscaRealizada = new EventEmitter<string>();

  readonly icones = ICONES;
  aberto = false;

  readonly principais: ItemMenu[] = [
    { chave: 'recomendacao', rotulo: 'Encontrar meu Ford', icone: 'ia' },
    { chave: 'modelos', rotulo: 'Modelos Ford', icone: 'carro' },
    { chave: 'comparacoes', rotulo: 'Minhas comparações', icone: 'grafico' },
  ];

  readonly atendimento: ItemMenu[] = [
    { chave: 'agendamentos', rotulo: 'Meus agendamentos', icone: 'agenda' },
    { chave: 'concessionarias', rotulo: 'Concessionárias', icone: 'local' },
    { chave: 'contato', rotulo: 'Fale conosco', icone: 'telefone' },
  ];

  readonly sobre: ItemMenu[] = [
    { chave: 'ia', rotulo: 'Como a IA decide', icone: 'cerebro' },
    { chave: 'termos', rotulo: 'Termos e contratos', icone: 'documento' },
  ];

  readonly modelos: ModeloFord[] = [
    { segmento: 'SUV / Elétrico', nome: 'Mustang Mach-E', preco: 'A partir de R$ 396.900' },
    { segmento: 'Picape / Performance', nome: 'Ranger Raptor', preco: 'A partir de R$ 448.600' },
    { segmento: 'Esportivo', nome: 'Mustang GT', preco: 'A partir de R$ 529.000' },
    { segmento: 'SUV / Off-road', nome: 'Bronco Sport', preco: 'A partir de R$ 264.900' }
  ];

  // Dados para os chips de atalho no HTML
  readonly atalhos: AtalhoBusca[] = [
    { chave: 'familia', rotulo: 'Família e Viagem', icone: ICONES['agenda'] },
    { chave: 'trabalho', rotulo: 'Uso Urbano / Trabalho', icone: ICONES['carro'] },
    { chave: 'offroad', rotulo: 'Aventura / Off-road', icone: ICONES['local'] }
  ];

  // Dados de exemplo para os resultados da IA
  readonly resultados: ResultadoIA[] = [
    { modelo: 'Territory', motivo: 'Excelente espaço interno para família, porta-malas generoso e conforto em viagens longas.', nota: 92 },
    { modelo: 'Ranger', motivo: 'Versátil para o trabalho e lazer, robustez mecânica e ótima capacidade de carga.', nota: 78 },
    { modelo: 'Bronco Sport', motivo: 'Boa dirigibilidade na cidade, tração integral robusta para fins de semana.', nota: 65 }
  ];

  // Passos de funcionamento da IA
  readonly passos: PassoFuncionamento[] = [
    { n: '01', titulo: 'Informe sua rotina', texto: 'Conte quantos quilômetros roda, se enfrenta trânsito ou estrada e quem viaja com você.' },
    { n: '02', titulo: 'Análise de dados', texto: 'A inteligência artificial cruza suas necessidades com especificações de motor, consumo e preço.' },
    { n: '03', titulo: 'Resultado inteligente', texto: 'Você recebe um ranking com o percentual exato de compatibilidade de cada modelo.' }
  ];

  alternar(): void {
    this.aberto = !this.aberto;
  }

  fechar(): void {
    this.aberto = false;
  }

  ir(chave: string): void {
    this.navegar.emit(chave);
    this.fechar();
  }

  selecionarModelo(nomeModelo: string): void {
    this.modeloSelecionado.emit(nomeModelo);
  }

  enviar(): void {
    if (this.termo.trim()) {
      this.buscaRealizada.emit(this.termo);
    }
  }

  selecionarAtalho(chaveAtalho: string): void {
    this.termo = `Busca rápida por: ${chaveAtalho}`;
  }

  @HostListener('document:keydown.escape')
  aoPressionarEsc(): void {
    this.fechar();
  }
}