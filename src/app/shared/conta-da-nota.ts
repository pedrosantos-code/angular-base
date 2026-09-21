import { calcularNota } from './recomendacao-ia';

/** Os números da fórmula de nota usada na busca do /portal e no recálculo do /modelos (ver calcularNota). */
export const PARTIDA_COM_PERFIL = 45;
export const PARTIDA_SEM_PERFIL = 55;
export const PONTOS_POR_ETIQUETA = 14;
export const PENALIDADE_ACIMA_DO_TETO = 30;
export const NOTA_MINIMA = 15;
export const NOTA_MAXIMA = 97;

/** A conta da nota de um modelo, parcela por parcela, para mostrar o cálculo em vez de só o resultado. */
export interface ContaDaNota {
  /** Ponto de partida: 45 quando o texto tem algum critério de uso, 55 quando não tem. */
  partida: number;
  /** Etiquetas escolhidas que o modelo tem: cada uma soma 14. */
  acertos: string[];
  /** Etiquetas escolhidas que o modelo não tem: não somam nada. */
  semEtiqueta: string[];
  /** 30 quando o preço "a partir de" passa do teto; senão 0. */
  penalidade: number;
  /** Soma das parcelas antes de limitar a nota (pode passar de 97 ou ficar abaixo de 15). */
  bruto: number;
  /** Nota final: a mesma que calcularNota devolve. */
  nota: number;
  /** Diz se a nota foi cortada no piso ou no teto. */
  limitada: 'minimo' | 'maximo' | null;
}

export function contaDaNota(
  tagsDoModelo: string[],
  tagsEscolhidas: string[],
  precoDe: number,
  orcamento: number | null,
): ContaDaNota {
  const partida = tagsEscolhidas.length ? PARTIDA_COM_PERFIL : PARTIDA_SEM_PERFIL;
  const acertos = tagsEscolhidas.filter((t) => tagsDoModelo.includes(t));
  const semEtiqueta = tagsEscolhidas.filter((t) => !tagsDoModelo.includes(t));
  const penalidade = orcamento && precoDe > orcamento ? PENALIDADE_ACIMA_DO_TETO : 0;
  const bruto = (tagsEscolhidas.length ? partida + acertos.length * PONTOS_POR_ETIQUETA : partida) - penalidade;
  const nota = calcularNota(tagsDoModelo, tagsEscolhidas, precoDe, orcamento);
  return {
    partida,
    acertos,
    semEtiqueta,
    penalidade,
    bruto,
    nota,
    limitada: bruto > NOTA_MAXIMA ? 'maximo' : bruto < NOTA_MINIMA ? 'minimo' : null,
  };
}
