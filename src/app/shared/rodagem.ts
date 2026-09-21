/**
 * Custo mensal de uso de cada carro a partir da rodagem mensal informada.
 * Tudo aqui é ESTIMATIVA: usa consumo, revisões e desgaste médios da tabela da equipe (DADOS_DE_USO).
 */

export type TipoMotor = 'combustao' | 'diesel' | 'hibrido' | 'eletrico';

/** Linha da tabela da equipe para um carro. */
export interface DadosDeUso {
  /** km/l (combustão, diesel e híbrido) ou km/kWh (elétrico). */
  consumo: number;
  /** Revisão a cada X km ou 12 meses, o que vier primeiro. */
  intervaloRevisaoKm: number;
  /** Preço médio de cada revisão, em reais. */
  precoRevisao: number;
  /** Custo de desgaste por km (pneus, freios), em reais. */
  desgastePorKm: number;
  /** Autonomia em km — obrigatória só para elétricos. */
  autonomiaKm?: number;
}

/** Preço da energia usada por cada tipo de motor: gasolina e diesel em R$/l, energia em R$/kWh. */
export interface PrecosEnergia {
  gasolina?: number;
  diesel?: number;
  energia?: number;
}

/**
 * Tabela fornecida pela equipe, por id do carro (mesmos ids de /modelos).
 * Enquanto um carro não estiver aqui, ele mostra "Dados de uso indisponíveis" e não recebe nota de rodagem:
 * nada é inventado.
 */
export const DADOS_DE_USO: Record<string, DadosDeUso> = {};

/** Preços do combustível e da energia, também fornecidos pela equipe. */
export const PRECOS_ENERGIA: PrecosEnergia = {};

export interface UsoIndisponivel { estado: 'sem-rodagem' | 'indisponivel'; }

export interface UsoEstimado {
  estado: 'ok';
  /** Energia + revisão + desgaste, por mês. */
  custoMes: number;
  /** Nota de rodagem (0 a 100): menor custo entre todos os carros ÷ custo deste × 100, para baixo. */
  nota: number;
  /** Revisão a cada N meses no ritmo do usuário (1 a 12). */
  revisaoACadaMeses: number;
  /** Elétrico que passa de 70% da autonomia por dia: perdeu 20 pontos e precisa do aviso de recarga. */
  recarga: boolean;
}

export type AvaliacaoUso = UsoIndisponivel | UsoEstimado;

/** Dias de uso por mês para converter a rodagem mensal em km por dia. */
const DIAS_DE_USO = 22;
const LIMITE_AUTONOMIA = 0.7;
const PENALIDADE_RECARGA = 20;

interface CustoBruto {
  custoMes: number;
  revisaoACadaMeses: number;
  recarga: boolean;
}

const positivo = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** Preço da energia do carro (ou undefined se não há dado). */
function precoDaEnergia(tipo: TipoMotor, precos: PrecosEnergia): number | undefined {
  const preco = tipo === 'eletrico' ? precos.energia : tipo === 'diesel' ? precos.diesel : precos.gasolina;
  return positivo(preco) ? preco : undefined;
}

/** Revisões por ano: rodagem anual ÷ intervalo, para cima, no mínimo 1 (o prazo de 12 meses vale sempre). */
export function revisoesPorAno(kmMes: number, intervaloKm: number): number {
  return Math.max(1, Math.ceil((kmMes * 12) / intervaloKm));
}

/** A cada quantos meses cai a revisão no ritmo do usuário: intervalo ÷ rodagem mensal, entre 1 e 12. */
export function mesesEntreRevisoes(kmMes: number, intervaloKm: number): number {
  return Math.max(1, Math.min(12, Math.floor(intervaloKm / kmMes)));
}

function custoBruto(tipo: TipoMotor, dados: DadosDeUso | undefined, precos: PrecosEnergia, kmMes: number): CustoBruto | null {
  if (!dados) return null;
  const preco = precoDaEnergia(tipo, precos);
  if (
    preco === undefined ||
    !positivo(dados.consumo) ||
    !positivo(dados.intervaloRevisaoKm) ||
    !positivo(dados.precoRevisao) ||
    !(typeof dados.desgastePorKm === 'number' && Number.isFinite(dados.desgastePorKm) && dados.desgastePorKm >= 0)
  ) {
    return null;
  }
  if (tipo === 'eletrico' && !positivo(dados.autonomiaKm)) return null;

  const energia = (kmMes / dados.consumo) * preco;
  const revisao = (revisoesPorAno(kmMes, dados.intervaloRevisaoKm) * dados.precoRevisao) / 12;
  const desgaste = kmMes * dados.desgastePorKm;

  const recarga = tipo === 'eletrico' && kmMes / DIAS_DE_USO > (dados.autonomiaKm as number) * LIMITE_AUTONOMIA;

  return {
    custoMes: energia + revisao + desgaste,
    revisaoACadaMeses: mesesEntreRevisoes(kmMes, dados.intervaloRevisaoKm),
    recarga,
  };
}

/**
 * Avalia TODOS os carros de uma vez, porque a nota de cada um depende do menor custo entre eles.
 * - Sem rodagem informada: ninguém é calculado ('sem-rodagem').
 * - Carro sem algum dado (tabela ou preço da energia): 'indisponivel', fica de fora da nota e do "menor custo".
 * - A nota nunca sobe: arredonda para baixo e o elétrico que exige recarga perde 20 pontos.
 */
export function avaliarUso(
  carros: { id: string; tipo: TipoMotor }[],
  kmMes: number | null,
  dados: Record<string, DadosDeUso> = DADOS_DE_USO,
  precos: PrecosEnergia = PRECOS_ENERGIA,
): Record<string, AvaliacaoUso> {
  const resultado: Record<string, AvaliacaoUso> = {};

  if (!positivo(kmMes)) {
    for (const c of carros) resultado[c.id] = { estado: 'sem-rodagem' };
    return resultado;
  }

  const brutos = new Map<string, CustoBruto>();
  for (const c of carros) {
    const bruto = custoBruto(c.tipo, dados[c.id], precos, kmMes);
    if (bruto) brutos.set(c.id, bruto);
  }

  const menorCusto = Math.min(...[...brutos.values()].map((b) => b.custoMes));

  for (const c of carros) {
    const b = brutos.get(c.id);
    if (!b) {
      resultado[c.id] = { estado: 'indisponivel' };
      continue;
    }
    const base = b.custoMes > 0 ? Math.floor((menorCusto / b.custoMes) * 100) : 100;
    const nota = Math.max(0, b.recarga ? base - PENALIDADE_RECARGA : base);
    resultado[c.id] = { estado: 'ok', custoMes: b.custoMes, nota, revisaoACadaMeses: b.revisaoACadaMeses, recarga: b.recarga };
  }
  return resultado;
}
