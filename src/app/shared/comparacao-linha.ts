import { Car } from '../ford-api.service';

/** Marcas concorrentes que existem na API (além da Ford). */
export type MarcaRival = 'HONDA' | 'HYUNDAI';

/** Um concorrente: como buscar na API e como reconhecer o modelo certo entre os resultados. */
export interface Rival {
  marca: MarcaRival;
  /** Termo enviado à API (busca por "contém"; precisa devolver menos de 100 resultados). */
  busca: string;
  /** Filtra o nome do modelo entre os resultados (a API mistura "Honda CR-V", "CR-V", versões antigas…). */
  filtro: RegExp;
  /** Nome mostrado na tela. */
  rotulo: string;
}

export interface Segmento {
  rotulo: string;
  rivais: Rival[];
}

/*
 * Picapes: Honda e Hyundai só têm DUAS picapes no catálogo inteiro — Ridgeline (Honda, média) e Santa Cruz
 * (Hyundai, compacta). Com só essas duas pra quatro modelos Ford (Ranger, Ranger Raptor, F-150 e Maverick
 * Hybrid), dá pra evitar repetição na maior parte, mas não em todo mundo:
 * - Maverick Hybrid (compacta, unibody) ......... só Santa Cruz (o porte que bate)
 * - Ranger e Ranger Raptor (média) ............... só Ridgeline (o porte que bate; a Raptor repete a mesma
 *   do Ranger de linha porque não existe picape de performance da Honda/Hyundai pra comparar)
 * - F-150 (extra-grande) .......................... as duas, já que nenhuma bate no porte dela sozinha
 */
const RIDGELINE: Rival = { marca: 'HONDA', busca: 'Ridgeline', filtro: /ridgeline/i, rotulo: 'Ridgeline' };
const SANTA_CRUZ: Rival = { marca: 'HYUNDAI', busca: 'Santa Cruz', filtro: /santa cruz/i, rotulo: 'Santa Cruz' };
const PICAPE_MEDIA: Segmento = { rotulo: 'Picape', rivais: [RIDGELINE] };
const PICAPE_COMPACTA: Segmento = { rotulo: 'Picape compacta', rivais: [SANTA_CRUZ] };
const PICAPE_EXTRA_GRANDE: Segmento = { rotulo: 'Picape extra-grande', rivais: [RIDGELINE, SANTA_CRUZ] };

/*
 * SUVs: aqui a Honda e a Hyundai têm bem mais opções que nas picapes, então dá pra separar por porte sem
 * repetir nenhum rival entre Bronco Sport, Territory e Explorer — cada um fica só com o degrau dele:
 * - Bronco Sport (compacto 2 fileiras) ... HR-V, ZR-V, Kona, Venue (os menores dos dois catálogos)
 * - Territory (um degrau acima, 2 fileiras) ... CR-V, Tucson
 * - Explorer (grande, 3 fileiras) ... Pilot, Passport, Palisade, Santa Fe (os maiores)
 */
const HR_V: Rival = { marca: 'HONDA', busca: 'HR-V', filtro: /^(honda )?hr-v$/i, rotulo: 'HR-V' };
const ZR_V: Rival = { marca: 'HONDA', busca: 'ZR-V', filtro: /zr-v/i, rotulo: 'ZR-V' };
const KONA: Rival = { marca: 'HYUNDAI', busca: 'Kona', filtro: /^hyundai kona$/i, rotulo: 'Kona' };
const VENUE: Rival = { marca: 'HYUNDAI', busca: 'Venue', filtro: /^hyundai venue$/i, rotulo: 'Venue' };
const CR_V: Rival = { marca: 'HONDA', busca: 'CR-V', filtro: /cr-v/i, rotulo: 'CR-V' };
const TUCSON: Rival = { marca: 'HYUNDAI', busca: 'Tucson', filtro: /^hyundai tucson$/i, rotulo: 'Tucson' };
const PILOT: Rival = { marca: 'HONDA', busca: 'Pilot', filtro: /pilot/i, rotulo: 'Pilot' };
const PASSPORT: Rival = { marca: 'HONDA', busca: 'Passport', filtro: /passport/i, rotulo: 'Passport' };
const PALISADE: Rival = { marca: 'HYUNDAI', busca: 'Palisade', filtro: /palisade/i, rotulo: 'Palisade' };
const SANTA_FE: Rival = { marca: 'HYUNDAI', busca: 'Santa Fe', filtro: /^hyundai santa fe$/i, rotulo: 'Santa Fe' };

/**
 * Cada modelo Ford é comparado só com concorrentes do MESMO segmento (SUV com SUV, picape com picape,
 * esportivo com esportivo). A API não tem o campo "carroceria", então o agrupamento é curado aqui à mão.
 */
export const SEGMENTOS: Record<string, Segmento> = {
  Mustang: {
    rotulo: 'Esportivo',
    rivais: [
      { marca: 'HONDA', busca: 'Type R', filtro: /civic type r/i, rotulo: 'Civic Type R' },
      { marca: 'HONDA', busca: 'NSX', filtro: /nsx/i, rotulo: 'NSX' },
      { marca: 'HYUNDAI', busca: 'Veloster N', filtro: /veloster n/i, rotulo: 'Veloster N' },
      { marca: 'HYUNDAI', busca: 'Elantra N', filtro: /elantra n/i, rotulo: 'Elantra N' },
    ],
  },
  Ranger: PICAPE_MEDIA,
  'Ranger Raptor': { ...PICAPE_MEDIA, rotulo: 'Picape de performance' },
  'F-150': PICAPE_EXTRA_GRANDE,
  'Maverick Hybrid': PICAPE_COMPACTA,
  'Bronco Sport': { rotulo: 'SUV compacto', rivais: [HR_V, ZR_V, KONA, VENUE] },
  Territory: { rotulo: 'SUV médio', rivais: [CR_V, TUCSON] },
  Explorer: { rotulo: 'SUV grande', rivais: [PILOT, PASSPORT, PALISADE, SANTA_FE] },
};

/**
 * Nome que a API usa para cada modelo Ford ("Ranger Super Cab", "Ford Ranger"…). Recebe `model` e `variant`
 * (ambos em minúsculas) — a maioria só olha o `model`, mas o Maverick Hybrid só dá pra reconhecer pelo
 * `variant`: a API nunca escreve "Hybrid" no `model` (é sempre "Ford Maverick"), só "FHEV" na variante.
 */
const PERTENCE_FORD: Record<string, (modelo: string, variante: string) => boolean> = {
  Mustang: (m) => m.includes('mustang') && !m.includes('mach'),
  Ranger: (m) => m.includes('ranger'),
  'Ranger Raptor': (m) => m.includes('ranger') && m.includes('raptor'),
  Territory: (m) => m.includes('territory'),
  'Bronco Sport': (m) => m.includes('bronco sport'),
  'Maverick Hybrid': (m, v) => m.includes('maverick') && (v.includes('fhev') || v.includes('hybrid')),
  Explorer: (m) => (m.startsWith('explorer') || m.includes('ford explorer')) && !m.includes('sport trac'),
  'F-150': (m) => m.includes('f-150') || m.includes('f150'),
};

/**
 * Versões de nicho, de performance extrema ou de carroceria diferente da linha ficam de fora: compara-se a
 * versão "de linha" (cupê fechado, cabine padrão) — convertible e as cabines extras do F-150 entram aqui
 * pelo mesmo motivo que o sport trac: não é o corte que representa o modelo.
 */
const NICHO_FORD = /raptor|gtd|shelby|gt500|gt350|svt|lightning|tremor|dark horse|sport trac|convertible|super\s?crew/i;

/** Modelos que SÃO a versão de nicho (ex.: Ranger Raptor): para eles o filtro acima não se aplica. */
const MODELOS_NICHO = new Set(['Ranger Raptor']);

export interface ItemComparacao {
  /** "Ford", "Honda"… */
  marca: string;
  modelo: string;
  carro: Car;
  ano: number | null;
  /** Potência em cv; null quando a API não publica e não dá para ler do nome da versão. */
  potencia: number | null;
  /** true só no modelo Ford que a pessoa pesquisou (é a referência da comparação). */
  referencia: boolean;
}

export interface Comparacao {
  segmento: string;
  itens: ItemComparacao[];
  /** Concorrentes que a API não devolveu (para avisar na tela). */
  semDados: string[];
}

/** Pega a potência do nome da versão, tipo "(319 HP)", quando o campo estruturado vem vazio. */
export function potenciaDoCarro(carro: Car): number | null {
  if (carro.enginePowerBhp != null) return Math.round(carro.enginePowerBhp);
  const doNome = `${carro.variant ?? ''}`.match(/\((\d+(?:\.\d+)?)\s*HP\)/i);
  return doNome ? Math.round(parseFloat(doNome[1])) : null;
}

/**
 * Regra única para escolher a versão que representa um modelo (Ford ou rival), para a comparação ser justa:
 * entre as candidatas com potência informada, a do ano mais recente e, nesse ano, a mais potente.
 * Se nenhuma tem potência, cai para a mais recente.
 */
export function escolherVersao(candidatas: Car[]): Car | null {
  if (!candidatas.length) return null;
  const comPotencia = candidatas.filter((c) => potenciaDoCarro(c) != null);
  const base = comPotencia.length ? comPotencia : candidatas;
  return [...base].sort((a, b) => {
    const anoA = a.yearFrom ?? 0;
    const anoB = b.yearFrom ?? 0;
    if (anoA !== anoB) return anoB - anoA;
    return (potenciaDoCarro(b) ?? -1) - (potenciaDoCarro(a) ?? -1);
  })[0];
}

export function versaoFord(modelo: string, carros: Car[]): Car | null {
  const pertence = PERTENCE_FORD[modelo];
  if (!pertence) return null;
  const ehNicho = MODELOS_NICHO.has(modelo);
  return escolherVersao(
    carros.filter(
      (c) =>
        pertence((c.model ?? '').toLowerCase(), (c.variant ?? '').toLowerCase()) &&
        (ehNicho || !NICHO_FORD.test(`${c.model ?? ''} ${c.variant ?? ''}`)),
    ),
  );
}

export function versaoRival(rival: Rival, carros: Car[]): Car | null {
  return escolherVersao(carros.filter((c) => rival.filtro.test(c.model ?? '')));
}

/** Chave estável de um rival, usada para guardar o que a API devolveu para ele. */
export function chaveRival(rival: Rival): string {
  return `${rival.marca}:${rival.busca}`;
}

/**
 * Monta a comparação de um modelo Ford com os concorrentes do segmento dele.
 * `carrosRivais` tem, por chaveRival(), o que a API devolveu para cada busca.
 */
export function montarComparacao(
  modeloFord: string,
  carrosFord: Car[],
  carrosRivais: Record<string, Car[]>,
): Comparacao | null {
  const segmento = SEGMENTOS[modeloFord];
  if (!segmento) return null;

  const itens: ItemComparacao[] = [];
  const semDados: string[] = [];

  const ford = versaoFord(modeloFord, carrosFord);
  if (ford) itens.push(item('Ford', modeloFord, ford, true));
  else semDados.push(`Ford ${modeloFord}`);

  for (const rival of segmento.rivais) {
    const carro = versaoRival(rival, carrosRivais[chaveRival(rival)] ?? []);
    if (carro) itens.push(item(nomeMarca(rival.marca), rival.rotulo, carro, false));
    else semDados.push(`${nomeMarca(rival.marca)} ${rival.rotulo}`);
  }
  return { segmento: segmento.rotulo, itens, semDados };
}

function nomeMarca(marca: MarcaRival): string {
  return marca === 'HONDA' ? 'Honda' : 'Hyundai';
}

function item(marca: string, modelo: string, carro: Car, referencia: boolean): ItemComparacao {
  return { marca, modelo, carro, ano: carro.yearFrom ?? null, potencia: potenciaDoCarro(carro), referencia };
}

/** Qual modelo Ford o texto digitado representa (ex.: "Ford F-150 Lightning" → "F-150"). */
export function modeloDaBusca(termo: string, modelos: string[]): string | null {
  const t = termo.trim().toLowerCase();
  if (!t) return null;
  // Mais longo primeiro: "Bronco Sport" antes de "Bronco".
  return [...modelos].sort((a, b) => b.length - a.length).find((m) => t.includes(m.toLowerCase())) ?? null;
}
