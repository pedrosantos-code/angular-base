import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TopbarComponent, ICONES, ITENS_PRINCIPAIS, ITENS_ATENDIMENTO, ITENS_SOBRE, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { AgenteComponent } from './agente/agente.component';
import { fotoDoModelo } from '../shared/fotos-modelos';
import { calcularNota, detectarOrcamento, detectarTags, formatarPerfil } from '../shared/recomendacao-ia';
import { AuthService } from '../auth.service';

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
   * Conferido na mão via curl: alguns nomes de trim do Brasil (Maverick Hybrid/Tremor,
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
  { nome: 'Transit Furgão', precoDe: 219900, tags: ['trabalho', 'carga'], motivo: 'Van de carga para uso comercial.', disponivelNoDashboard: false },
  { nome: 'Transit Minibus', precoDe: 239900, tags: ['trabalho', 'viagem'], motivo: 'Van de passageiros, ideal para transporte de grupos.', disponivelNoDashboard: false },
];

export interface PassoFuncionamento {
  n: string;
  titulo: string;
  texto: string;
}

@Component({
  selector: 'seia-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, RodapeComponent, AgenteComponent],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.css',
})
export class PortalComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  ativo = 'recomendacao';

  /** Termo digitado na caixa de busca (vinculado via ngModel) */
  termo = '';

  /** Nota de corte para cor da barra de progresso */
  readonly corteFraco = 60;


  /** Foto do modelo (ou null quando não há). */
  readonly foto = fotoDoModelo;

  readonly principais = ITENS_PRINCIPAIS;
  readonly atendimento = ITENS_ATENDIMENTO;
  readonly sobre = ITENS_SOBRE;

  readonly modelos: ModeloFord[] = [
    { segmento: 'SUV / Elétrico', nome: 'Mustang Mach-E', preco: 'A partir de R$ 379.900' },
    { segmento: 'Picape / Performance', nome: 'Ranger Raptor', preco: 'A partir de R$ 399.900' },
    { segmento: 'Esportivo', nome: 'Mustang GT', preco: 'A partir de R$ 549.900' },
    { segmento: 'SUV / Off-road', nome: 'Bronco Sport', preco: 'A partir de R$ 249.900' }
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
  /** Tags e orçamento por trás do perfilDetectado — levados pro /modelos quando a pessoa navega de lá pra cá. */
  private tagsDetectadas: string[] = [];
  private orcamentoDetectado: number | null = null;

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
    { n: '02', titulo: 'Análise de dados', texto: 'O sistema procura no seu texto palavras de uso (família, estrada, cidade…) e orçamento, e compara com o perfil de cada modelo.' },
    { n: '03', titulo: 'Resultado inteligente', texto: 'Você recebe os modelos ordenados por % de compatibilidade, cada um com o motivo.' }
  ];

  ir(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (!rota) return;

    // Se a pessoa já buscou algo aqui, leva o perfil detectado pro /modelos em vez de um clique "cego".
    if (chave === 'modelos' && this.tagsDetectadas.length) {
      this.router.navigate([rota], {
        queryParams: {
          tags: this.tagsDetectadas.join(','),
          orcamento: this.orcamentoDetectado ?? undefined,
        },
      });
      return;
    }

    this.router.navigateByUrl(rota);
  }

  sair(): void {
    void this.authService.logout();
  }

  selecionarModelo(nomeModelo: string): void {
    this.router.navigate(['/modelos'], { queryParams: { termo: nomeModelo } });
  }

  /** Leva a recomendação pro Dashboard, que já faz a busca sozinho na API real da Ford. */
  verFichaTecnica(nomeModelo: string): void {
    this.router.navigate(['/dashboard'], { queryParams: { modelo: nomeModelo } });
  }

  enviar(): void {
    const texto = this.termo.trim();
    if (!texto) return;

    const { resultado, perfil, tags, orcamento } = this.calcularRecomendacao(texto);
    this.resultadoCalculado = resultado;
    this.perfilDetectado = perfil;
    this.tagsDetectadas = tags;
    this.orcamentoDetectado = orcamento;
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
  private calcularRecomendacao(texto: string): { resultado: ResultadoIA[]; perfil: string; tags: string[]; orcamento: number | null } {
    const tagsDetectadas = detectarTags(texto);
    const orcamento = detectarOrcamento(texto);

    const pontuados = CATALOGO_RECOMENDACAO
      .filter((m) => m.disponivelNoDashboard)
      .map((m) => ({
        modelo: m.nome,
        motivo: m.motivo,
        nota: calcularNota(m.tags, tagsDetectadas, m.precoDe, orcamento),
        disponivelNoDashboard: m.disponivelNoDashboard,
      }));

    pontuados.sort((a, b) => b.nota - a.nota);

    return {
      resultado: pontuados.slice(0, 3),
      perfil: formatarPerfil(tagsDetectadas, orcamento),
      tags: tagsDetectadas,
      orcamento,
    };
  }
}