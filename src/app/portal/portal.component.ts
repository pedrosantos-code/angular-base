import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TopbarComponent, ICONES, ITENS_PRINCIPAIS, ITENS_ATENDIMENTO, ITENS_SOBRE, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';

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
  /** Só true pros modelos que realmente existem na API da Ford usada no Dashboard — ver comentário do catálogo. */
  disponivelNoDashboard: boolean;
}

interface ModeloCatalogo {
  nome: string;
  precoDe: number;
  /** Palavras-chave de uso associadas ao modelo, usadas na pontuação por texto livre. */
  tags: string[];
  motivo: string;
  /**
   * Se uma busca por esse nome exato retorna resultado na API real do Dashboard (api-ford-linux...).
   * Conferido na mão via curl: alguns nomes de trim do Brasil (Maverick Hybrid/Tremor, E-Transit,
   * Transit Furgão/Minibus) não existem na base internacional — deixar o botão sumir pra esses.
   */
  disponivelNoDashboard: boolean;
}

/** Mesma linha de modelos do /modelos, com tags de uso pra pontuar a busca em texto livre. */
const CATALOGO_RECOMENDACAO: ModeloCatalogo[] = [
  { nome: 'Territory', precoDe: 219900, tags: ['familia', 'viagem', 'estrada', 'cidade'], motivo: 'Espaço interno generoso e conforto para viagens em família.', disponivelNoDashboard: true },
  { nome: 'Bronco Sport', precoDe: 249900, tags: ['offroad', 'aventura', 'familia'], motivo: 'Tração 4x4 e robustez para fins de semana de aventura.', disponivelNoDashboard: true },
  { nome: 'Explorer', precoDe: 429900, tags: ['familia', 'viagem', 'estrada'], motivo: '7 lugares e porta-malas grande para famílias maiores.', disponivelNoDashboard: true },
  { nome: 'Ranger', precoDe: 259900, tags: ['trabalho', 'offroad', 'carga'], motivo: 'Versátil para trabalho e lazer, com boa capacidade de carga.', disponivelNoDashboard: true },
  { nome: 'Ranger Raptor', precoDe: 399900, tags: ['performance', 'offroad', 'aventura'], motivo: 'Suspensão de performance para trilha e alta velocidade off-road.', disponivelNoDashboard: true },
  { nome: 'Maverick Hybrid', precoDe: 219900, tags: ['cidade', 'economia', 'trabalho'], motivo: 'Motor híbrido eficiente para o dia a dia na cidade.', disponivelNoDashboard: false },
  { nome: 'Maverick Tremor', precoDe: 249900, tags: ['offroad', 'aventura'], motivo: 'Picape compacta preparada para trilha.', disponivelNoDashboard: false },
  { nome: 'Mustang GT', precoDe: 549900, tags: ['performance'], motivo: 'Motor V8 de alta performance, foco em esportividade.', disponivelNoDashboard: true },
  { nome: 'Mustang Mach-E', precoDe: 379900, tags: ['cidade', 'eletrico', 'familia'], motivo: 'SUV elétrico silencioso, boa autonomia para o dia a dia.', disponivelNoDashboard: true },
  { nome: 'F-150', precoDe: 439900, tags: ['trabalho', 'carga', 'performance'], motivo: 'Picape robusta de grande porte para trabalho pesado.', disponivelNoDashboard: true },
  { nome: 'F-150 Lightning', precoDe: 599900, tags: ['trabalho', 'eletrico'], motivo: 'Versão elétrica da F-150, com tração 4x4.', disponivelNoDashboard: true },
  { nome: 'E-Transit', precoDe: 349900, tags: ['trabalho', 'cidade', 'eletrico'], motivo: 'Van elétrica para entregas urbanas.', disponivelNoDashboard: false },
  { nome: 'Transit Furgão', precoDe: 219900, tags: ['trabalho', 'carga'], motivo: 'Van de carga para uso comercial.', disponivelNoDashboard: false },
  { nome: 'Transit Minibus', precoDe: 239900, tags: ['trabalho', 'viagem'], motivo: 'Van de passageiros, ideal para transporte de grupos.', disponivelNoDashboard: false },
];

/** Palavras do texto livre que ativam cada tag de uso. */
const DICIONARIO_TAGS: Record<string, string[]> = {
  familia: [
    'família', 'familia', 'filhos', 'filho', 'filha', 'crianças', 'criancas', 'criança', 'crianca',
    'esposa', 'marido', 'mulher', 'namorada', 'namorado', 'casal', 'bebê', 'bebe', 'pais', 'avó', 'avo',
    'avô', 'netos', 'cadeirinha',
  ],
  viagem: [
    'viagem', 'viajo', 'viajar', 'longa distância', 'longa distancia', 'road trip', 'passeio',
    'passear', 'praia', 'litoral', 'interior', 'excursão', 'excursao', 'fora da cidade',
  ],
  estrada: ['estrada', 'rodovia', 'pista', 'asfalto', 'br-', 'rodovias'],
  cidade: [
    'cidade', 'urbano', 'urbana', 'trânsito', 'transito', 'dia a dia', 'cotidiano', 'centro',
    'engarrafamento', 'estacionar', 'garagem pequena',
  ],
  offroad: [
    'off-road', 'offroad', 'trilha', 'trilhas', 'terra', 'estrada de terra', '4x4', 'quatro rodas',
    'picada', 'mato', 'lama', 'atoleiro', 'fazenda', 'sítio', 'sitio',
  ],
  aventura: [
    'aventura', 'fim de semana', 'final de semana', 'camping', 'acampar', 'natureza', 'montanha',
    'cachoeira', 'trilha' , 'radical',
  ],
  trabalho: [
    'trabalho', 'trabalhar', 'entrega', 'entregas', 'entregador', 'comercial', 'empresa',
    'uso profissional', 'profissional', 'uber', 'aplicativo', 'app', 'motorista de app',
    'representante', 'vendas', 'vendedor', 'expediente', 'serviço', 'servico',
  ],
  carga: ['carga', 'transportar', 'mudança', 'mudanca', 'material de construção', 'material de construcao', 'ferramentas', 'equipamentos', 'peso'],
  performance: ['performance', 'esportivo', 'esportiva', 'velocidade', 'potência', 'potencia', 'curva', 'pista de corrida', 'track day', 'acelerar'],
  economia: [
    'economia', 'econômico', 'economico', 'econômica', 'economica', 'consumo', 'combustível',
    'combustivel', 'gastar pouco', 'baixo consumo', 'poupar', 'barato',
  ],
  eletrico: ['elétrico', 'eletrico', 'elétrica', 'eletrica', 'híbrido', 'hibrido', 'híbrida', 'hibrida', 'carregar', 'tomada', 'sustentável', 'sustentavel'],
};

export interface PassoFuncionamento {
  n: string;
  titulo: string;
  texto: string;
}

@Component({
  selector: 'seia-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, RodapeComponent],
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

  // Exemplo ilustrativo, mostrado só até a pessoa fazer uma busca de verdade
  readonly resultadosExemplo: ResultadoIA[] = [
    { modelo: 'Territory', motivo: 'Excelente espaço interno para família, porta-malas generoso e conforto em viagens longas.', nota: 92, disponivelNoDashboard: true },
    { modelo: 'Ranger', motivo: 'Versátil para o trabalho e lazer, robustez mecânica e ótima capacidade de carga.', nota: 78, disponivelNoDashboard: true },
    { modelo: 'Bronco Sport', motivo: 'Boa dirigibilidade na cidade, tração integral robusta para fins de semana.', nota: 65, disponivelNoDashboard: true }
  ];

  /** Preenchido depois que a pessoa busca de verdade — enquanto nulo, mostramos o exemplo acima. */
  resultadoCalculado: ResultadoIA[] | null = null;
  perfilDetectado: string | null = null;

  get resultados(): ResultadoIA[] {
    return this.resultadoCalculado ?? this.resultadosExemplo;
  }

  get tituloResultados(): string {
    return this.resultadoCalculado ? 'SEU RESULTADO' : 'EXEMPLO DE RESULTADO';
  }

  get subtituloResultados(): string {
    return this.resultadoCalculado ? `perfil: ${this.perfilDetectado}` : 'perfil: família, estrada, até R$ 250 mil';
  }

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
    this.router.navigate(['/modelos'], { queryParams: { termo: nomeModelo } });
  }

  /** Leva a recomendação pro Dashboard, que já faz a busca sozinho na API real da Ford. */
  verFichaTecnica(nomeModelo: string): void {
    this.router.navigate(['/dashboard'], { queryParams: { modelo: nomeModelo } });
  }

  enviar(): void {
    const texto = this.termo.trim();
    if (!texto) return;

    this.buscaRealizada.emit(texto);
    const { resultado, perfil } = this.calcularRecomendacao(texto);
    this.resultadoCalculado = resultado;
    this.perfilDetectado = perfil;
  }

  private readonly atalhoTextos: Record<string, string> = {
    familia: 'Uso o carro para viajar com a família e rodar na estrada.',
    trabalho: 'Uso o carro na cidade, no trânsito, para trabalho e economia.',
    offroad: 'Gosto de aventura, trilha e off-road nos fins de semana.',
  };

  selecionarAtalho(chaveAtalho: string): void {
    this.termo = this.atalhoTextos[chaveAtalho] ?? '';
    this.enviar();
  }

  /** Pontua o catálogo por palavra-chave batida no texto livre — sem IA real, tudo local. */
  private calcularRecomendacao(texto: string): { resultado: ResultadoIA[]; perfil: string } {
    const textoNormalizado = texto.toLowerCase();

    const tagsDetectadas = Object.entries(DICIONARIO_TAGS)
      .filter(([, palavras]) => palavras.some((p) => textoNormalizado.includes(p)))
      .map(([tag]) => tag);

    const orcamentoMatch = textoNormalizado.match(/r?\$?\s*(\d+)\s*mil/);
    const orcamento = orcamentoMatch ? Number(orcamentoMatch[1]) * 1000 : null;

    const pontuados = CATALOGO_RECOMENDACAO
      .filter((m) => m.disponivelNoDashboard)
      .map((m) => {
        const acertos = tagsDetectadas.filter((t) => m.tags.includes(t)).length;
        let nota = tagsDetectadas.length ? 45 + acertos * 14 : 55;
        if (orcamento && m.precoDe > orcamento) nota -= 30;
        nota = Math.max(15, Math.min(97, nota));
        return { modelo: m.nome, motivo: m.motivo, nota, disponivelNoDashboard: m.disponivelNoDashboard };
      });

    pontuados.sort((a, b) => b.nota - a.nota);

    const partesPerfil = [
      ...tagsDetectadas,
      orcamento ? `até R$ ${(orcamento / 1000).toFixed(0)} mil` : null,
    ].filter((p): p is string => !!p);

    return {
      resultado: pontuados.slice(0, 3),
      perfil: partesPerfil.length ? partesPerfil.join(', ') : 'sem critérios claros no texto',
    };
  }
}