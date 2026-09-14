import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TopbarComponent, ICONES, ITENS_PRINCIPAIS, ITENS_ATENDIMENTO, ITENS_SOBRE, ROTAS_MENU } from '../topbar/topbar.component';

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

@Component({
  selector: 'seia-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.css',
})
export class PortalComponent {
  private router = inject(Router);

  @Input() ativo = 'recomendacao';

  /** Termo digitado na caixa de busca (vinculado via ngModel) */
  termo = '';

  /** Nota de corte para cor da barra de progresso */
  readonly corteFraco = 60;

  @Output() navegar = new EventEmitter<string>();
  @Output() abrirPerfil = new EventEmitter<void>();
  @Output() abrirConfiguracoes = new EventEmitter<void>();
  @Output() modeloSelecionado = new EventEmitter<string>();
  @Output() buscaRealizada = new EventEmitter<string>();

  readonly principais = ITENS_PRINCIPAIS;
  readonly atendimento = ITENS_ATENDIMENTO;
  readonly sobre = ITENS_SOBRE;

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

  ir(chave: string): void {
    this.navegar.emit(chave);
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    this.router.navigateByUrl('/');
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
}