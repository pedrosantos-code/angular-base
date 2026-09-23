import { ConsultaAfinidade } from './api-pessoas.service';

/**
 * ============================================================================
 * PERFIL DEMOGRÁFICO — leitura do texto livre para os campos da API Pessoas
 * ============================================================================
 *
 * O analista descreve o cliente em português ("mulher de 34 anos, ensino
 * superior, mora em Campinas") e este módulo extrai só os campos que a API
 * aceita. É regex explícito, não modelo de linguagem: a mesma frase produz
 * sempre a mesma consulta, e cada campo carrega a marca de lido ou assumido.
 *
 * Os domínios abaixo são os enums reais do /openapi.json — mandar outro valor
 * devolve 422. Não há campo de preço nem de orçamento porque a API Pessoas não
 * publica preço: ela mede quem já roda com cada modelo, não quanto ele custa.
 */

export type Genero = 'masculino' | 'feminino';
export type Escolaridade = 'fundamental_incompleto' | 'fundamental' | 'medio' | 'superior';
export type Area = 'urbana' | 'rural';

/** A API rejeita idade abaixo disso: os grupos demográficos começam em 20-29. */
export const IDADE_MINIMA = 20;

export const ROTULO_ESCOLARIDADE: Record<Escolaridade, string> = {
  fundamental_incompleto: 'Fundamental incompleto',
  fundamental: 'Fundamental completo',
  medio: 'Ensino médio',
  superior: 'Ensino superior',
};

export const ROTULO_AREA: Record<Area, string> = { urbana: 'Urbana', rural: 'Rural' };

export interface PerfilDemografico {
  idade: number | null;
  genero: Genero | null;
  /** true quando o gênero saiu de palavra explícita; false quando veio da concordância. */
  generoExplicito: boolean;
  municipio: string | null;
  regiao: string | null;
  rendaPerCapitaSm: number | null;
  escolaridade: Escolaridade | null;
  area: Area | null;
}

export interface FatoLido {
  rotulo: string;
  valor: string;
  /** false quando o agente assumiu ou não encontrou o valor no texto. */
  lido: boolean;
}

const PERFIL_VAZIO: PerfilDemografico = {
  idade: null, genero: null, generoExplicito: false, municipio: null,
  regiao: null, rendaPerCapitaSm: null, escolaridade: null, area: null,
};

/** Extrai da descrição em texto livre tudo que a API sabe receber. */
export function interpretarPerfil(entrada: string): PerfilDemografico {
  const texto = entrada.toLowerCase();
  const genero = lerGenero(texto);

  return {
    ...PERFIL_VAZIO,
    idade: lerIdade(texto),
    genero: genero.valor,
    generoExplicito: genero.explicito,
    municipio: lerMunicipio(entrada),
    rendaPerCapitaSm: lerRenda(texto),
    escolaridade: lerEscolaridade(texto),
    area: lerArea(texto),
  };
}

function lerIdade(texto: string): number | null {
  const m = texto.match(/(\d{2,3})\s*anos/);
  if (m) return Number(m[1]);
  if (/\bjovem\b|\brec[eé]m[- ]formad|\buniversit[áa]ri/.test(texto)) return 23;
  if (/\baposentad/.test(texto)) return 65;
  return null;
}

/**
 * Gênero é obrigatório na API. Quando não está escrito, a concordância resolve:
 * "solteiro" é masculino, "solteira" é feminino. A distinção entre lido e inferido
 * aparece na tela — quem revisa precisa saber que essa parte foi dedução gramatical.
 */
function lerGenero(texto: string): { valor: Genero | null; explicito: boolean } {
  if (/\b(homem|masculino|rapaz|senhor|menino|pai)\b/.test(texto)) return { valor: 'masculino', explicito: true };
  if (/\b(mulher|feminino|mo[çc]a|senhora|menina|m[ãa]e)\b/.test(texto)) return { valor: 'feminino', explicito: true };

  // Concordância: o -a final dos adjetivos de estado civil carrega o gênero.
  if (/\b(solteira|casada|divorciada|separada|vi[uú]va|aposentada|formada|graduada)\b/.test(texto)) {
    return { valor: 'feminino', explicito: false };
  }
  if (/\b(solteiro|casado|divorciado|separado|vi[uú]vo|aposentado|formado|graduado)\b/.test(texto)) {
    return { valor: 'masculino', explicito: false };
  }
  return { valor: null, explicito: false };
}

/**
 * Candidato a município, preservando acentos e maiúsculas do texto original —
 * a API casa por nome ("Campinas", "São José dos Campos"). O nome só vale depois
 * de conferido no autocomplete; aqui é apenas o palpite inicial do campo.
 */
function lerMunicipio(entrada: string): string | null {
  const m = entrada.match(
    /\b(?:mora|moro|reside|residente|vive|vivo|domiciliad[oa])\s+(?:em|n[oa]s?)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ']*(?:\s+(?:d[aeo]s?|[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ']*)){0,3})/,
  );
  if (!m) return null;

  // Corta preposição solta que tenha entrado no fim ("mora em Campinas com a").
  return m[1].replace(/\s+(d[aeo]s?)$/i, '').trim() || null;
}

/**
 * Renda per capita em salários mínimos — a unidade da API. Só aceita o que está
 * escrito nessa unidade: converter reais para SM exigiria fixar o valor do
 * salário do ano, uma premissa que mudaria o resultado sem aparecer na tela.
 */
function lerRenda(texto: string): number | null {
  const sm = texto.match(/(\d+(?:[.,]\d+)?)\s*(?:sal[áa]rios?\s*m[íi]nimos?|\bsm\b)/);
  if (sm) return Number(sm[1].replace(',', '.'));

  const perCapita = texto.match(/renda\s*(?:per\s*capita)?\s*(?:de\s*)?(\d+(?:[.,]\d+)?)\s*sm/);
  return perCapita ? Number(perCapita[1].replace(',', '.')) : null;
}

function lerEscolaridade(texto: string): Escolaridade | null {
  if (/superior|faculdade|graduad|universit[áa]ri|mestrad|doutorad|p[óo]s[- ]gradua/.test(texto)) return 'superior';
  if (/ensino m[ée]dio|segundo grau|m[ée]dio completo|colegial/.test(texto)) return 'medio';
  if (/fundamental incompleto|n[ãa]o (?:completou|terminou) o fundamental|primeiro grau incompleto/.test(texto)) {
    return 'fundamental_incompleto';
  }
  if (/fundamental|primeiro grau|prim[áa]rio/.test(texto)) return 'fundamental';
  return null;
}

function lerArea(texto: string): Area | null {
  if (/zona rural|[áa]rea rural|\brural\b|fazenda|s[íi]tio|ro[çc]a|ass?entamento/.test(texto)) return 'rural';
  if (/zona urbana|[áa]rea urbana|\burbana?\b|cidade|capital|metr[óo]pole|munic[íi]pio/.test(texto)) return 'urbana';
  return null;
}

// ---------------------------------------------------------------------------
// Validação e tradução para a consulta
// ---------------------------------------------------------------------------

/** O que ainda falta para a API aceitar a consulta. Lista vazia = pode consultar. */
export function faltasDoPerfil(p: PerfilDemografico): string[] {
  const faltas: string[] = [];
  if (p.idade === null) faltas.push('idade');
  else if (p.idade < IDADE_MINIMA) faltas.push(`idade de ${IDADE_MINIMA} anos ou mais`);
  if (p.genero === null) faltas.push('gênero');
  return faltas;
}

/** Monta a consulta da API. Só chame quando faltasDoPerfil devolver vazio. */
export function consultaDoPerfil(p: PerfilDemografico, top = 10): ConsultaAfinidade {
  return {
    genero: p.genero!,
    idade: p.idade!,
    // Município tem precedência sobre região: os dois juntos deixariam ambíguo
    // qual recorte a API usou para calcular o share local.
    municipio: p.municipio || null,
    regiao: p.municipio ? null : p.regiao || null,
    renda_per_capita_sm: p.rendaPerCapitaSm,
    escolaridade: p.escolaridade,
    area: p.area,
    top,
  };
}

/** As premissas do painel: o que foi lido do texto e o que ficou em branco. */
export function fatosDoPerfil(p: PerfilDemografico): FatoLido[] {
  return [
    { rotulo: 'Idade', valor: p.idade ? `${p.idade} anos` : 'não informada', lido: p.idade !== null },
    {
      rotulo: 'Gênero',
      valor: p.genero ? (p.genero === 'masculino' ? 'Masculino' : 'Feminino') : 'não informado',
      lido: p.genero !== null && p.generoExplicito,
    },
    {
      rotulo: 'Município',
      valor: p.municipio ?? (p.regiao ? `região de ${p.regiao}` : 'estado de SP (município médio)'),
      lido: p.municipio !== null || p.regiao !== null,
    },
    {
      rotulo: 'Renda per capita',
      valor: p.rendaPerCapitaSm !== null ? `${p.rendaPerCapitaSm} salário(s) mínimo(s)` : 'não informada',
      lido: p.rendaPerCapitaSm !== null,
    },
    {
      rotulo: 'Escolaridade',
      valor: p.escolaridade ? ROTULO_ESCOLARIDADE[p.escolaridade] : 'não informada',
      lido: p.escolaridade !== null,
    },
    {
      rotulo: 'Área',
      valor: p.area ? ROTULO_AREA[p.area] : 'não informada',
      lido: p.area !== null,
    },
  ];
}
