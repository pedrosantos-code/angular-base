/**
 * O carro em primeiro lugar no perfil da pessoa, guardado a cada "Salvar perfil" para o /agendamentos
 * já vir com ele no passo "Qual modelo?".
 */
export const CHAVE_MODELO_RECOMENDADO = 'seia-modelo-recomendado';

export interface ModeloRecomendado {
  /** Nome como no catálogo ("Territory", "Maverick Hybrid"). */
  nome: string;
  /** Rótulo curto do segmento ("SUV médio"). */
  segmento: string;
  /** Quanto do preço "a partir de" o orçamento cobre (0 a 100); null quando a pessoa não informou orçamento. */
  cobertura: number | null;
}

export function salvarModeloRecomendado(modelo: ModeloRecomendado): void {
  try {
    localStorage.setItem(CHAVE_MODELO_RECOMENDADO, JSON.stringify(modelo));
  } catch {
    // localStorage indisponível — o /agendamentos segue com o modelo padrão.
  }
}

/** Lê o modelo guardado; devolve null se não há nada ou se o que está guardado não tem o formato esperado. */
export function lerModeloRecomendado(): ModeloRecomendado | null {
  try {
    const bruto = localStorage.getItem(CHAVE_MODELO_RECOMENDADO);
    if (!bruto) return null;
    const dado = JSON.parse(bruto) as Partial<ModeloRecomendado>;
    if (typeof dado.nome !== 'string' || !dado.nome) return null;
    return {
      nome: dado.nome,
      segmento: typeof dado.segmento === 'string' ? dado.segmento : '',
      cobertura: typeof dado.cobertura === 'number' ? dado.cobertura : null,
    };
  } catch {
    return null;
  }
}
