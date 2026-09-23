import {
  FatorCosseno, ItemCosseno, ItemRanking, PerfilApi,
} from './api-pessoas.service';

/**
 * ============================================================================
 * AFINIDADE — junta os dois métodos da API num resultado único
 * ============================================================================
 *
 * A API responde de duas formas e as duas importam:
 *
 *  - `regressao` responde "quanto este grupo pesa na frota" — share do perfil,
 *    share do município e o lift entre os dois. É o número de dimensionamento.
 *  - `cosseno` responde "o que é característico deste perfil" — e entrega os
 *    fatores que explicam, com contribuição quantificada.
 *
 * Ranquear por share sozinho devolve sempre o carro mais popular do estado
 * (o Gol lidera quase todo perfil), o que não informa nada. O lift e o cosseno
 * são o que separa um perfil do outro, então os dois viajam juntos em cada item.
 *
 * Nenhum número é calculado aqui além de razões entre campos da própria resposta.
 */

export interface MatchModelo {
  modelo: string;
  /** Posição no ranking por regressão (1 = maior share dentro do perfil). */
  posicao: number;
  sharePerfilPct: number;
  shareMunicipioPct: number;
  /** >1 = o grupo escolhe mais que a média local; <1 = escolhe menos. */
  lift: number;
  /** Semelhança com o perfil típico do modelo, quando o método cosseno respondeu. */
  cosseno: number | null;
  cosDemografia: number | null;
  cosContexto: number | null;
  fatores: FatorCosseno[];
  /** Posição no ranking por cosseno, para mostrar onde os dois métodos discordam. */
  posicaoCosseno: number | null;
}

/** Junta os dois rankings pelo nome do modelo, preservando a ordem da regressão. */
export function combinarRankings(
  regressao: ItemRanking[],
  cosseno: ItemCosseno[] = [],
): MatchModelo[] {
  const porNome = new Map(cosseno.map((c, i) => [c.modelo, { item: c, posicao: i + 1 }]));

  return regressao.map((r, i) => {
    const c = porNome.get(r.modelo);
    return {
      modelo: r.modelo,
      posicao: i + 1,
      sharePerfilPct: r.share_perfil_pct,
      shareMunicipioPct: r.share_municipio_pct,
      lift: r.lift,
      cosseno: c?.item.cosseno ?? null,
      cosDemografia: c?.item.cos_demografia ?? null,
      cosContexto: c?.item.cos_contexto ?? null,
      fatores: c?.item.principais_fatores ?? [],
      posicaoCosseno: c?.posicao ?? null,
    };
  });
}

/**
 * Os modelos mais característicos do perfil: ordenados por lift, não por share.
 *
 * É a lista que responde "o que este grupo escolhe mais que os vizinhos", que é
 * a pergunta de uma reunião de segmentação. O ranking por share fica na tabela
 * completa, para quem precisa do tamanho absoluto.
 */
export function ordenarPorLift(matches: MatchModelo[]): MatchModelo[] {
  return [...matches].sort((a, b) => b.lift - a.lift);
}

/** Converte lift em variação percentual legível: 1.099 → "+9,9%". */
export function liftEmPercentual(lift: number): string {
  const variacao = (lift - 1) * 100;
  const sinal = variacao >= 0 ? '+' : '−';
  return `${sinal}${Math.abs(variacao).toFixed(1).replace('.', ',')}%`;
}

export function sobreIndexa(lift: number): boolean {
  return lift > 1;
}

/** Como a API interpretou a localidade da consulta. */
export function rotuloLocalidade(perfil: PerfilApi): string {
  const l = perfil.localidade;
  return l.tipo === 'municipio' ? l.nome : l.tipo === 'regiao' ? `região de ${l.nome}` : l.nome;
}

export function formatarPct(valor: number): string {
  return `${valor.toFixed(2).replace('.', ',')}%`;
}
