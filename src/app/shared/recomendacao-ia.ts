/** Palavras do texto livre que ativam cada tag de uso. Compartilhado entre /portal (busca) e /modelos (recálculo da nota). */
export const DICIONARIO_TAGS: Record<string, string[]> = {
  familia: [
    'família', 'familia', 'filhos', 'filho', 'filha', 'crianças', 'criancas', 'criança', 'crianca',
    'esposa', 'marido', 'mulher', 'namorada', 'namorado', 'casal', 'bebê', 'bebe', 'pais', 'avó', 'avo',
    'avô', 'netos', 'cadeirinha',
  ],
  viagem: [
    'viagem', 'viagens', 'viajo', 'viajar', 'longa distância', 'longa distancia', 'road trip', 'passeio',
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
    'cachoeira', 'trilha', 'radical',
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

/**
 * Monta o regex de uma palavra do dicionário. A palavra precisa começar no início de uma palavra
 * do texto ("filhos" acha "filho", mas "avo" não acha "favorito"). Palavras curtas (até 5 letras)
 * também precisam terminar ali, aceitando plural ("pais" não acha "paisagem", "app" não acha "apple").
 */
function regexDaPalavra(palavra: string): RegExp {
  const escapada = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fim = palavra.length <= 5 ? 's?(?![\\p{L}])' : '';
  return new RegExp(`(?<![\\p{L}])${escapada}${fim}`, 'u');
}

const REGEX_POR_TAG: [string, RegExp[]][] = Object.entries(DICIONARIO_TAGS).map(([tag, palavras]) => [
  tag,
  palavras.map(regexDaPalavra),
]);

/** Quais tags do dicionário aparecem no texto livre digitado pela pessoa. */
export function detectarTags(texto: string): string[] {
  const textoNormalizado = texto.toLowerCase();
  return REGEX_POR_TAG
    .filter(([, regexes]) => regexes.some((r) => r.test(textoNormalizado)))
    .map(([tag]) => tag);
}

/** Extrai um orçamento tipo "250 mil" / "R$ 250 mil" do texto livre, se houver. */
export function detectarOrcamento(texto: string): number | null {
  // "mil" precisa ser a palavra inteira: "60 milhas" e "1 milhão" não são orçamento.
  const match = texto.toLowerCase().match(/r?\$?\s*(\d+)\s*mil(?![\p{L}])/u);
  return match ? Number(match[1]) * 1000 : null;
}

/** Pontua um modelo pelas tags batidas e pelo orçamento — mesma fórmula usada na busca do /portal. */
export function calcularNota(tagsModelo: string[], tagsDetectadas: string[], precoDe: number, orcamento: number | null): number {
  const acertos = tagsDetectadas.filter((t) => tagsModelo.includes(t)).length;
  let nota = tagsDetectadas.length ? 45 + acertos * 14 : 55;
  if (orcamento && precoDe > orcamento) nota -= 30;
  return Math.max(15, Math.min(97, nota));
}

/** Texto curto tipo "família, estrada, até R$ 250 mil" pra exibir como resumo do perfil detectado. */
export function formatarPerfil(tagsDetectadas: string[], orcamento: number | null): string {
  const partes = [
    ...tagsDetectadas,
    orcamento ? `até R$ ${(orcamento / 1000).toFixed(0)} mil` : null,
  ].filter((p): p is string => !!p);

  return partes.length ? partes.join(', ') : 'sem critérios claros no texto';
}
