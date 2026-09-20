import { MERCADO_POR_MODELO } from './mercado-modelos';

/**
 * ============================================================================
 * AGENTE DE PERFIL — motor de recomendação determinístico
 * ============================================================================
 *
 * Recebe a descrição do cliente em texto livre ("solteiro, 20 anos, sem filhos,
 * mora em cidade grande"), extrai os fatos demográficos, converte em pesos por
 * eixo de necessidade e pontua o catálogo.
 *
 * É regra explícita, não modelo de linguagem: a mesma frase devolve sempre o
 * mesmo ranking, e cada ponto do score é rastreável até o fato que o gerou —
 * que é o que o analista precisa quando perguntam "por que esse carro?" na reunião.
 */

export type Eixo = 'espaco' | 'economia' | 'urbano' | 'performance' | 'robustez' | 'carga';

export const EIXOS: { chave: Eixo; rotulo: string; descricao: string }[] = [
  { chave: 'espaco', rotulo: 'Espaço', descricao: 'Lugares, porta-malas e conforto para mais de um ocupante' },
  { chave: 'economia', rotulo: 'Economia', descricao: 'Consumo, manutenção e custo por quilômetro' },
  { chave: 'urbano', rotulo: 'Uso urbano', descricao: 'Dirigibilidade em trânsito, tamanho e facilidade de estacionar' },
  { chave: 'performance', rotulo: 'Performance', descricao: 'Potência, resposta e apelo esportivo' },
  { chave: 'robustez', rotulo: 'Robustez', descricao: 'Tração, altura livre e uso fora do asfalto' },
  { chave: 'carga', rotulo: 'Carga', descricao: 'Caçamba, reboque e transporte de volume' },
];

export type EstadoCivil = 'solteiro' | 'casado' | 'divorciado' | 'viuvo';
export type PorteCidade = 'grande' | 'media' | 'pequena';

export interface PerfilCliente {
  idade: number | null;
  estadoCivil: EstadoCivil | null;
  filhos: number | null;
  porteCidade: PorteCidade | null;
  /** Renda mensal em reais, quando informada. */
  rendaMensal: number | null;
  /** Teto de preço do veículo, informado ou estimado. */
  orcamento: number;
  /** true quando o orçamento foi estimado pelo agente em vez de informado. */
  orcamentoEstimado: boolean;
  /** Tags de uso detectadas no texto (trabalho, viagem, offroad...). */
  usos: string[];
}

export interface FatoLido {
  rotulo: string;
  valor: string;
  /** false quando o agente assumiu um valor em vez de ler do texto. */
  lido: boolean;
}

interface ModeloCatalogo {
  nome: string;
  precoDe: number;
  segmento: string;
  perfil: Record<Eixo, number>;
}

/**
 * Perfil de cada modelo nos seis eixos, de 0 a 100. Só entram modelos que a API
 * de veículos realmente conhece — nomes de trim brasileiros (Maverick, Transit)
 * não existem na base internacional e deixariam o painel sem ficha técnica.
 */
const CATALOGO: ModeloCatalogo[] = [
  { nome: 'Territory',       precoDe: 219900, segmento: 'SUV médio',        perfil: { espaco: 82, economia: 68, urbano: 70, performance: 45, robustez: 35, carga: 45 } },
  { nome: 'Bronco Sport',    precoDe: 249900, segmento: 'SUV off-road',     perfil: { espaco: 70, economia: 55, urbano: 62, performance: 58, robustez: 88, carga: 50 } },
  { nome: 'Explorer',        precoDe: 429900, segmento: 'SUV grande',       perfil: { espaco: 95, economia: 38, urbano: 40, performance: 62, robustez: 55, carga: 62 } },
  { nome: 'Ranger',          precoDe: 259900, segmento: 'Picape média',     perfil: { espaco: 60, economia: 48, urbano: 42, performance: 62, robustez: 85, carga: 92 } },
  { nome: 'Ranger Raptor',   precoDe: 399900, segmento: 'Picape performance', perfil: { espaco: 58, economia: 30, urbano: 32, performance: 90, robustez: 95, carga: 78 } },
  { nome: 'Mustang Mach-E',  precoDe: 379900, segmento: 'SUV elétrico',     perfil: { espaco: 72, economia: 88, urbano: 78, performance: 80, robustez: 30, carga: 45 } },
  { nome: 'Mustang GT',      precoDe: 549900, segmento: 'Esportivo',        perfil: { espaco: 28, economia: 18, urbano: 35, performance: 98, robustez: 20, carga: 15 } },
  { nome: 'F-150',           precoDe: 439900, segmento: 'Picape full-size', perfil: { espaco: 68, economia: 28, urbano: 22, performance: 70, robustez: 88, carga: 98 } },
  { nome: 'F-150 Lightning', precoDe: 599900, segmento: 'Picape elétrica',  perfil: { espaco: 70, economia: 72, urbano: 30, performance: 82, robustez: 85, carga: 95 } },
];

/** Palavras de uso que o agente reconhece, além dos fatos demográficos. */
const PALAVRAS_USO: Record<string, string[]> = {
  trabalho: ['trabalho', 'trabalhar', 'profissional', 'empresa', 'frota', 'comercial', 'entrega', 'obra', 'uber', 'aplicativo'],
  carga: ['carga', 'carregar', 'transportar', 'reboque', 'ferramenta', 'material', 'equipamento'],
  viagem: ['viagem', 'viaja', 'viajar', 'estrada', 'rodovia', 'praia', 'litoral'],
  offroad: ['off-road', 'offroad', 'trilha', 'terra', '4x4', 'fazenda', 'sítio', 'sitio', 'rural'],
  performance: ['performance', 'esportivo', 'potência', 'potencia', 'velocidade', 'acelera'],
  economia: ['economia', 'econômico', 'economico', 'consumo', 'combustível', 'combustivel', 'barato', 'gastar pouco'],
  eletrico: ['elétrico', 'eletrico', 'híbrido', 'hibrido', 'sustentável', 'sustentavel', 'emissão', 'emissao'],
};

function contem(texto: string, palavras: string[]): boolean {
  return palavras.some((p) => texto.includes(p));
}

/** Extrai os fatos demográficos da descrição em texto livre. */
export function interpretarPerfil(entrada: string): PerfilCliente {
  const texto = entrada.toLowerCase();

  const idade = lerIdade(texto);
  const estadoCivil = lerEstadoCivil(texto);
  const filhos = lerFilhos(texto);
  const porteCidade = lerPorteCidade(texto);
  const rendaMensal = lerRenda(texto);

  const orcamentoInformado = lerOrcamento(texto);
  const orcamento = orcamentoInformado ?? estimarOrcamento(idade, rendaMensal, estadoCivil);

  const usos = Object.entries(PALAVRAS_USO)
    .filter(([, palavras]) => contem(texto, palavras))
    .map(([tag]) => tag);

  return {
    idade,
    estadoCivil,
    filhos,
    porteCidade,
    rendaMensal,
    orcamento,
    orcamentoEstimado: orcamentoInformado === null,
    usos,
  };
}

function lerIdade(texto: string): number | null {
  const m = texto.match(/(\d{2})\s*anos/);
  if (m) return Number(m[1]);
  // "jovem" / "aposentado" também posicionam a faixa, sem número exato.
  if (/\bjovem\b|\brecém[- ]formad|\buniversitári/.test(texto)) return 23;
  if (/\baposentad/.test(texto)) return 65;
  return null;
}

function lerEstadoCivil(texto: string): EstadoCivil | null {
  if (/\bsolteir/.test(texto)) return 'solteiro';
  if (/\bcasad|\buni[aã]o est[aá]vel|\bmorando junto|\besposa\b|\bmarido\b|\bc[oô]njuge/.test(texto)) return 'casado';
  if (/\bdivorciad|\bseparad/.test(texto)) return 'divorciado';
  if (/\bvi[uú]v/.test(texto)) return 'viuvo';
  return null;
}

function lerFilhos(texto: string): number | null {
  if (/\bsem filhos|\bnenhum filho|\bn[aã]o tem filhos/.test(texto)) return 0;

  const numerado = texto.match(/(\d+)\s*filho/);
  if (numerado) return Number(numerado[1]);

  const porExtenso: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4 };
  const extenso = texto.match(/\b(um|uma|dois|duas|tr[êe]s|quatro)\s+filho/);
  if (extenso) return porExtenso[extenso[1].replace('ê', 'e')] ?? 1;

  if (/\bcom filhos|\bfilhos\b|\bcrian[çc]a|\bbeb[êe]\b|\bcadeirinha/.test(texto)) return 2;
  return null;
}

function lerPorteCidade(texto: string): PorteCidade | null {
  if (/cidade grande|capital|metr[oó]pole|grande centro|s[aã]o paulo|rio de janeiro|regi[aã]o metropolitana/.test(texto)) return 'grande';
  if (/cidade m[eé]dia|cidade de porte m[eé]dio/.test(texto)) return 'media';
  if (/cidade pequena|interior|zona rural|[aá]rea rural|fazenda|s[ií]tio|ro[çc]a/.test(texto)) return 'pequena';
  return null;
}

function lerRenda(texto: string): number | null {
  const m = texto.match(/renda[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*mil/);
  if (m) return Number(m[1].replace(',', '.')) * 1000;

  const reais = texto.match(/renda[^\d]{0,20}r?\$?\s*(\d{4,6})/);
  return reais ? Number(reais[1]) : null;
}

function lerOrcamento(texto: string): number | null {
  const m = texto.match(/(?:or[çc]amento|at[eé]|gastar|investir|comprar por)[^\d]{0,20}r?\$?\s*(\d+)\s*mil/);
  if (m) return Number(m[1]) * 1000;

  const solto = texto.match(/r\$\s*(\d+)\s*mil/);
  return solto ? Number(solto[1]) * 1000 : null;
}

/**
 * Teto de preço quando ninguém informou. Serve só para não recomendar um carro de
 * R$ 550 mil a um cliente de 20 anos — a tela mostra essa premissa e deixa editar.
 */
function estimarOrcamento(idade: number | null, renda: number | null, estadoCivil: EstadoCivil | null): number {
  // Regra de bolso de crédito: veículo até ~30x a renda mensal.
  if (renda) return Math.round(renda * 30);

  const base = idade === null ? 280000 : idade < 25 ? 150000 : idade < 35 ? 260000 : idade < 50 ? 360000 : 400000;
  return estadoCivil === 'casado' ? Math.round(base * 1.15) : base;
}

/** Os fatos que o agente extraiu, para o painel de premissas. */
export function fatosDoPerfil(p: PerfilCliente): FatoLido[] {
  const rotuloCivil: Record<EstadoCivil, string> = {
    solteiro: 'Solteiro(a)', casado: 'Casado(a) / união estável', divorciado: 'Divorciado(a)', viuvo: 'Viúvo(a)',
  };
  const rotuloCidade: Record<PorteCidade, string> = {
    grande: 'Cidade grande / capital', media: 'Cidade média', pequena: 'Cidade pequena / interior',
  };

  return [
    { rotulo: 'Idade', valor: p.idade ? `${p.idade} anos` : 'não informada', lido: p.idade !== null },
    { rotulo: 'Estado civil', valor: p.estadoCivil ? rotuloCivil[p.estadoCivil] : 'não informado', lido: p.estadoCivil !== null },
    { rotulo: 'Filhos', valor: p.filhos === null ? 'não informado' : p.filhos === 0 ? 'sem filhos' : `${p.filhos}`, lido: p.filhos !== null },
    { rotulo: 'Praça', valor: p.porteCidade ? rotuloCidade[p.porteCidade] : 'não informada', lido: p.porteCidade !== null },
    { rotulo: 'Teto de preço', valor: formatarReais(p.orcamento), lido: !p.orcamentoEstimado },
    { rotulo: 'Uso citado', valor: p.usos.length ? p.usos.join(', ') : 'nenhum uso específico', lido: p.usos.length > 0 },
  ];
}

/**
 * Converte os fatos em peso por eixo (0 a 100). Cada linha aqui é uma hipótese de
 * negócio explícita — é este bloco que a área de produto revisa quando o ranking
 * sai diferente do esperado.
 */
export function pesosDoPerfil(p: PerfilCliente): Record<Eixo, number> {
  const pesos: Record<Eixo, number> = { espaco: 30, economia: 40, urbano: 35, performance: 25, robustez: 20, carga: 15 };

  if (p.filhos !== null) pesos.espaco += Math.min(45, p.filhos * 22);
  if (p.estadoCivil === 'casado') pesos.espaco += 15;
  if (p.filhos === 0) pesos.espaco -= 15;

  if (p.idade !== null && p.idade < 25) pesos.economia += 30;
  else if (p.idade !== null && p.idade < 35) pesos.economia += 15;
  if (p.idade !== null && p.idade >= 50) pesos.espaco += 10;

  if (p.porteCidade === 'grande') { pesos.urbano += 45; pesos.economia += 10; pesos.robustez -= 15; }
  if (p.porteCidade === 'media') pesos.urbano += 15;
  if (p.porteCidade === 'pequena') { pesos.urbano -= 20; pesos.robustez += 30; }

  // Jovem, solteiro e sem filhos: o carro compete com estilo de vida, não com logística familiar.
  if (p.idade !== null && p.idade < 30 && p.estadoCivil === 'solteiro' && p.filhos === 0) pesos.performance += 30;

  if (p.usos.includes('trabalho')) { pesos.carga += 35; pesos.robustez += 15; }
  if (p.usos.includes('carga')) pesos.carga += 45;
  if (p.usos.includes('viagem')) { pesos.espaco += 20; pesos.economia += 10; }
  if (p.usos.includes('offroad')) { pesos.robustez += 45; pesos.urbano -= 15; }
  if (p.usos.includes('performance')) pesos.performance += 35;
  if (p.usos.includes('economia')) pesos.economia += 25;
  if (p.usos.includes('eletrico')) pesos.economia += 20;

  for (const eixo of Object.keys(pesos) as Eixo[]) {
    pesos[eixo] = Math.max(0, Math.min(100, pesos[eixo]));
  }
  return pesos;
}

export interface Razao {
  eixo: Eixo;
  texto: string;
  /** Quanto esse eixo contribuiu para o score final, em pontos percentuais. */
  contribuicao: number;
}

/** Nota a partir da qual o modelo é considerado forte no eixo. */
const CORTE_FORTE = 60;
/** Abaixo disso o eixo vira ponto de atenção, se ele pesar para o perfil. */
const CORTE_FRACO = 50;
/** Peso mínimo para uma fraqueza merecer aviso — eixo irrelevante não é problema. */
const PESO_RELEVANTE = 40;

export interface MatchVeiculo {
  modelo: string;
  segmento: string;
  precoDe: number;
  /** Aderência final ao perfil, de 0 a 100. */
  score: number;
  /** Score antes do ajuste de preço — útil para explicar um corte por orçamento. */
  scoreBruto: number;
  /** Negativo quando o preço passou do teto. */
  ajustePreco: number;
  perfil: Record<Eixo, number>;
  /** Pontos fortes que sustentam o match — só eixos onde o modelo realmente vai bem. */
  razoes: Razao[];
  /** Maior fraqueza num eixo que pesa para este perfil, quando existe. */
  atencao: Razao | null;
  diferencial: string;
  shareLinha: number;
  posicaoVendas: number;
  compradorTipico: string;
  dentroDoOrcamento: boolean;
}

/** Pontua o catálogo inteiro e devolve ordenado da maior para a menor aderência. */
export function ranquear(perfil: PerfilCliente): MatchVeiculo[] {
  const pesos = pesosDoPerfil(perfil);
  const somaPesos = Object.values(pesos).reduce((a, b) => a + b, 0) || 1;

  return CATALOGO.map((modelo) => {
    const scoreBruto = (Object.keys(pesos) as Eixo[])
      .reduce((total, eixo) => total + pesos[eixo] * modelo.perfil[eixo], 0) / somaPesos;

    const ajustePreco = calcularAjustePreco(modelo.precoDe, perfil.orcamento);
    const score = Math.max(5, Math.min(99, Math.round(scoreBruto + ajustePreco)));

    const mercado = MERCADO_POR_MODELO.get(modelo.nome);

    return {
      modelo: modelo.nome,
      segmento: modelo.segmento,
      precoDe: modelo.precoDe,
      score,
      scoreBruto: Math.round(scoreBruto),
      ajustePreco: Math.round(ajustePreco),
      perfil: modelo.perfil,
      razoes: montarRazoes(pesos, modelo.perfil, somaPesos, perfil),
      atencao: montarAtencao(pesos, modelo.perfil, somaPesos, perfil),
      diferencial: mercado?.diferencial ?? '',
      shareLinha: mercado?.shareLinha ?? 0,
      posicaoVendas: mercado?.posicaoVendas ?? 0,
      compradorTipico: mercado?.compradorTipico ?? '',
      dentroDoOrcamento: modelo.precoDe <= perfil.orcamento,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Preço acima do teto derruba o score proporcionalmente ao excesso, em vez de
 * eliminar o modelo: 10% acima quase não pesa, o dobro do teto tira o carro do pódio.
 *
 * O teto de -60 é alto de propósito. Com um limite baixo, todo modelo muito acima do
 * orçamento levava a mesma penalidade e o preço parava de diferenciar — um cliente de
 * 20 anos recebia um elétrico de R$ 380 mil à frente de um SUV de R$ 220 mil, já que
 * os dois batiam no mesmo teto. Assim o mais barato ganha quando nada cabe.
 */
function calcularAjustePreco(preco: number, orcamento: number): number {
  if (preco <= orcamento) return 0;
  const excesso = (preco - orcamento) / orcamento;
  return -Math.min(60, excesso * 55);
}

/**
 * As maiores contribuições em eixos onde o modelo é de fato forte.
 *
 * Filtrar por força importa: ordenar só por pontos fazia um eixo de peso alto em que
 * o modelo vai mal encabeçar a lista de motivos — o card dizia "recomendo por causa
 * da economia" e logo abaixo explicava que a economia era ruim.
 */
function montarRazoes(
  pesos: Record<Eixo, number>,
  perfilModelo: Record<Eixo, number>,
  somaPesos: number,
  cliente: PerfilCliente,
): Razao[] {
  const contribuicoes = (Object.keys(pesos) as Eixo[])
    .map((eixo) => ({
      eixo,
      contribuicao: Math.round((pesos[eixo] * perfilModelo[eixo]) / somaPesos),
      texto: textoForte(eixo, cliente),
    }))
    .sort((a, b) => b.contribuicao - a.contribuicao);

  const fortes = contribuicoes.filter((r) => perfilModelo[r.eixo] >= CORTE_FORTE);

  // Nenhum eixo forte (acontece com modelo de nicho num perfil que não é o dele):
  // mostra o maior contribuidor mesmo assim, para o card nunca ficar vazio.
  return fortes.length ? fortes.slice(0, 3) : contribuicoes.slice(0, 1);
}

/** A fraqueza que mais compromete este perfil — nada, se o modelo não é fraco onde importa. */
function montarAtencao(
  pesos: Record<Eixo, number>,
  perfilModelo: Record<Eixo, number>,
  somaPesos: number,
  cliente: PerfilCliente,
): Razao | null {
  const fraquezas = (Object.keys(pesos) as Eixo[])
    .filter((eixo) => perfilModelo[eixo] < CORTE_FRACO && pesos[eixo] >= PESO_RELEVANTE)
    .sort((a, b) => pesos[b] - pesos[a]);

  if (!fraquezas.length) return null;

  const eixo = fraquezas[0];
  return {
    eixo,
    contribuicao: Math.round((pesos[eixo] * perfilModelo[eixo]) / somaPesos),
    texto: textoFraco(eixo, cliente),
  };
}

function textoForte(eixo: Eixo, c: PerfilCliente): string {
  switch (eixo) {
    case 'urbano':
      return c.porteCidade === 'grande'
        ? 'Porte e manobrabilidade resolvem o trânsito e a vaga da capital, que é o uso declarado.'
        : 'Tamanho e dirigibilidade facilitam o dia a dia na praça declarada.';
    case 'economia':
      return c.idade !== null && c.idade < 25
        ? 'Custo por quilômetro baixo, o fator decisivo na primeira compra dessa faixa de idade.'
        : 'Consumo e manutenção seguram o custo total de propriedade.';
    case 'espaco':
      return c.filhos && c.filhos > 0
        ? `Acomoda ${c.filhos} filho(s) com porta-malas sobrando, sem apertar ninguém.`
        : 'Espaço de sobra para o perfil declarado, com folga para bagagem.';
    case 'performance':
      return 'Desempenho e presença pesam na decisão de um comprador sem restrição de logística familiar.';
    case 'robustez':
      return 'Tração e altura livre cobrem o uso fora do asfalto que apareceu na descrição.';
    case 'carga':
      return 'Caçamba e reboque atendem o uso de trabalho declarado.';
  }
}

function textoFraco(eixo: Eixo, c: PerfilCliente): string {
  switch (eixo) {
    case 'urbano':
      return c.porteCidade === 'grande'
        ? 'Exige mais paciência na vaga e no trânsito da capital do que os concorrentes do ranking.'
        : 'Tamanho pesa contra no uso urbano do dia a dia.';
    case 'economia':
      return c.idade !== null && c.idade < 25
        ? 'Custo de uso acima do que a faixa de renda dessa idade costuma absorver.'
        : 'Custo de uso é o ponto fraco do modelo neste perfil.';
    case 'espaco':
      return 'Espaço limitado para o tamanho de família declarado.';
    case 'performance':
      return 'Desempenho suficiente, mas não é onde o modelo se destaca.';
    case 'robustez':
      return 'Feito para asfalto — perde terreno se o uso incluir estrada de terra.';
    case 'carga':
      return 'Capacidade de carga limitada, adequada a uso pessoal.';
  }
}

export function formatarReais(valor: number): string {
  return `R$ ${(valor / 1000).toFixed(0)} mil`;
}

/**
 * Parágrafo pronto para colar no slide: explica por que a massa de compradores
 * escolhe o modelo líder, cruzando os drivers de preferência com o perfil analisado.
 */
export function narrativaExecutiva(match: MatchVeiculo, perfil: PerfilCliente): string {
  const mercado = MERCADO_POR_MODELO.get(match.modelo);
  if (!mercado) return '';

  const [d1, d2] = mercado.drivers;
  const posicao = match.posicaoVendas === 1
    ? 'é o modelo mais emplacado da linha'
    : `ocupa a ${match.posicaoVendas}ª posição de emplacamento da linha`;

  const convergencia = match.razoes[0];
  const eixoLider = EIXOS.find((e) => e.chave === convergencia.eixo)?.rotulo.toLowerCase() ?? '';

  const ressalva = match.dentroDoOrcamento
    ? `O preço de entrada (${formatarReais(match.precoDe)}) cabe no teto ${perfil.orcamentoEstimado ? 'estimado' : 'informado'} de ${formatarReais(perfil.orcamento)}.`
    : `Atenção: o preço de entrada (${formatarReais(match.precoDe)}) passa do teto ${perfil.orcamentoEstimado ? 'estimado' : 'informado'} de ${formatarReais(perfil.orcamento)} — o score já foi descontado em ${Math.abs(match.ajustePreco)} pontos por isso.`;

  return (
    `O ${match.modelo} ${posicao}, com ${match.shareLinha}% de participação estimada. ` +
    `A massa de compradores cita ${d1.fator.toLowerCase()} (${d1.peso}%) e ${d2.fator.toLowerCase()} (${d2.peso}%) como fatores decisivos, ` +
    `e o comprador típico é: ${mercado.compradorTipico.toLowerCase()} ` +
    `Para o perfil analisado, a convergência acontece em ${eixoLider}, que responde por ${convergencia.contribuicao} dos ${match.score} pontos de aderência. ` +
    `O diferencial competitivo é objetivo: ${mercado.diferencial.charAt(0).toLowerCase()}${mercado.diferencial.slice(1)} ` +
    ressalva
  );
}
