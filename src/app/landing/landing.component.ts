import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  @Output() goLogin = new EventEmitter<void>();

  // Palavras-chave para a faixa de marquee animada
  keywords: string[] = [
    'INTELIGÊNCIA AUTOMOTIVA',
    'FICHAS TÉCNICAS',
    'DADOS DE CONCORRENTES',
    'FORD SEIA',
    'AUTOMAÇÃO DE COLETA',
    'RELATÓRIOS ESTRATÉGICOS'
  ];

  // Problemas mapeados na seção 01
  problems: string[] = [
    'Dezenas de sites de montadoras diferentes para monitorar manualmente.',
    'Padrões de atributos desencontrados e difíceis de cruzar em planilhas.',
    'Perda de tempo operacional preciosa da equipe de engenharia e produto.'
  ];

  // Linhas comparativas (Planilha Manual vs SEIA)
  oldRows = [
    { a: 'SUV Concorrente A', b: 'Ficha obtida via PDF desatualizado', c: 'Incompleto', fg: '#B4453A' },
    { a: 'Picape Concorrente B', b: 'Preço coletado há 2 semanas', c: 'Divergente', fg: '#B4453A' }
  ];

  newRows = [
    { a: 'SUV Concorrente A', b: 'Atualizado em tempo real', c: 'Normalizado' },
    { a: 'Picape Concorrente B', b: 'Atualizado em tempo real', c: 'Normalizado' }
  ];

  // Pilares da proposta (Seção 02)
  pillars = [
    { k: '01 / COLETA', t: 'Robôs de Varredura', d: 'Varredura contínua nos portais de referência do mercado automotivo.' },
    { k: '02 / PADRONIZAÇÃO', t: 'Dicionário Único Ford', d: 'Tradução automática de termos técnicos diferentes para um padrão corporativo comum.' },
    { k: '03 / DECISÃO', t: 'Dashboards Executivos', d: 'Comparativos prontos para exportação e análise gerencial imediata.' }
  ];

  // Etapas de funcionamento (Seção 03)
  steps = [
    { n: '01', t: 'Varredura', d: 'O motor rastreia atualizações nas fichas dos concorrentes.' },
    { n: '02', t: 'Limpeza', d: 'O sistema remove ruídos e padroniza as métricas técnicas.' },
    { n: '03', t: 'Cruzamento', d: 'Os dados são consolidados na base de inteligência.' },
    { n: '04', t: 'Entrega', d: 'O relatório executivo fica disponível instantaneamente.' }
  ];

  // Dados da tabela comparativa
  tableRows = [
    { a: 'Atributo', b: 'Ford SEIA', c: 'Concorrente X', d: 'Concorrente Y', bg: '#002B5C', fg: '#fff', fw: '700' },
    { a: 'Motorização', b: '2.0 EcoBoost', c: '1.9 Turbo', d: '2.2 Diesel', bg: '#fff', fg: '#41525F', fw: '400' },
    { a: 'Consumo Cidade', b: '10.5 km/l', c: '9.8 km/l', d: '10.0 km/l', bg: '#F7FAFC', fg: '#0B57A4', fw: '600' }
  ];

  // Barras do gráfico ilustrativo
  bars = [
    { h: '60%', c: '#2E7DD1', l: 'Ford' },
    { h: '45%', c: '#CFE0EF', l: 'Conc A' },
    { h: '75%', c: '#2E7DD1', l: 'Conc B' },
    { h: '50%', c: '#CFE0EF', l: 'Conc C' }
  ];

  // Arquitetura TOGAF
  arch = [
    { t: 'Camada de Apresentação', d: 'Angular Standalone Components na Intranet Ford' },
    { t: 'Camada de Negócios', d: 'Microsserviços de Normalização de Dados' },
    { t: 'Camada de Dados', d: 'Armazenamento seguro e cache otimizado' }
  ];

  // Tabela de diferenciais
  compare = [
    { k: 'Tempo de Resposta', a: 'Dias ou semanas', b: 'Lento e genérico', c: 'Minutos em tempo real' },
    { k: 'Padronização', a: 'Inexistente (manual)', b: 'Parcial', c: 'Total por dicionário Ford' }
  ];

  // Métricas de impacto
  metrics = [
    { v: '-90%', l: 'Esforço Operacional', n: 'Redução drástica no trabalho de copiar dados' },
    { v: '100%', l: 'Confiabilidade', n: 'Informações validadas e centralizadas' }
  ];

  valueCols = [
    { k: 'Eficiência', items: ['Agilidade na resposta ao mercado', 'Foco em estratégia e não em buscas'] }
  ];

  chapters = [
    { num: '01', tag: 'Problema' },
    { num: '02', tag: 'Proposta' },
    { num: '03', tag: 'Arquitetura' }
  ];

  // Integrantes do squad
  team = [
    { n: 'Desenvolvedor / Analista', rm: 'RM XXXXXX' },
    { n: 'Desenvolvedor / Arquiteto', rm: 'RM XXXXXX' }
  ];

  // Função chamada pelos botões de abertura de modal/passos
  open(index: number) {
    console.log('Passo ou capítulo acionado:', index);
    // Aqui você pode implementar a lógica para abrir um modal ou navegar
  }
}