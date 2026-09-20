/**
 * Roteiro do Hero: converte o progresso de scroll da seção (0 a 1) no estado de cada camada.
 * Função pura (sem DOM) para poder ser testada. Cada valor sai em 0..1 e vira uma
 * variável CSS no host do componente.
 */

/** Fração final do scroll em que a cena já terminou e o estado final fica "segurado". */
export const HOLD_START = 0.85;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Progresso de `s` dentro de [a, b], suavizado (smoothstep). */
const range = (s: number, a: number, b: number) => {
  const t = clamp01((s - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export interface RevealPhases {
  /** "Role para iniciar" */
  hint: number;
  /** Contorno (linhas de capô, teto, para-lamas) */
  outline: number;
  /** Preenchimento tênue da silhueta */
  sil: number;
  /** Raio da máscara que revela a carroceria a partir da grade */
  rev: number;
  /** Brilho da carroceria: começa quase apagada e vai acendendo */
  bright: number;
  /** Selo "identificado" (fim do scanner) */
  tag: number;
  /** DRLs (curva de LED) e bloom */
  drl: number;
  bloom: number;
  /** Faróis, halo, névoa lateral, piso e reflexo azul */
  head: number;
  /** Scanner: posição da linha (0..1) e opacidade */
  scan: number;
  scanO: number;
  /** Recuo do carro para dar lugar ao texto */
  recede: number;
  /** Entrada do texto em 4 passos */
  t: [number, number, number, number];
}

export function revealPhases(progress: number): RevealPhases {
  const s = clamp01(progress / HOLD_START);

  const outlineIn = range(s, 0.1, 0.3);
  // O contorno some conforme a carroceria surge (fica só um resto discreto).
  const outlineOut = range(s, 0.45, 0.6);
  const outline = (0.1 + 0.5 * outlineIn) * (1 - 0.9 * outlineOut) * (1 - range(s, 0.9, 1));

  const scanT = clamp01((s - 0.9) / 0.08);

  const step = (i: number) => range(s, 0.93 + i * 0.012, 0.93 + i * 0.012 + 0.03);

  return {
    hint: 1 - range(s, 0, 0.06),
    outline,
    sil: outlineIn * 0.1 * (1 - range(s, 0.4, 0.55)),
    rev: range(s, 0.22, 0.5),
    bright: 0.1 + 0.9 * range(s, 0.12, 0.55),
    tag: range(s, 0.97, 1),
    drl: range(s, 0.55, 0.7),
    bloom: range(s, 0.58, 0.72),
    head: range(s, 0.8, 0.9),
    scan: scanT,
    scanO: Math.sin(scanT * Math.PI),
    recede: range(s, 0.93, 1),
    t: [step(0), step(1), step(2), step(3)]
  };
}
