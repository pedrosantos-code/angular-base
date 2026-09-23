import { EfeitoContexto, GrupoLift } from './api-pessoas.service';

/**
 * ============================================================================
 * LINGUAGEM EXECUTIVA — traduz o vocabulário da base para o da reunião
 * ============================================================================
 *
 * A base fala em lift, cosseno, desvio padrão e intervalo de confiança. Isso é
 * correto e é o que sustenta o número, mas não é o que um gestor lê num slide:
 * "lift 0,696" não diz nada, "compra 30% menos que a média da cidade" decide.
 *
 * Aqui só acontece tradução. Nenhum número é recalculado nem arredondado a favor
 * de nada, e o dado técnico continua disponível no painel, atrás do botão de
 * detalhe — a ideia é tirar o jargão da frente, não esconder a evidência.
 */

/** "8,1%" da frota vira "1 em cada 12", que é como as pessoas pensam frequência. */
export function frequenciaLegivel(sharePct: number): string {
  if (sharePct <= 0) return 'nenhum';
  const umEmCada = Math.round(100 / sharePct);
  return `1 em cada ${umEmCada}`;
}

/** lift 0,696 vira "30% menos que a média da cidade". */
export function diferencaLegivel(lift: number): string {
  const pontos = Math.round(Math.abs(lift - 1) * 100);
  if (pontos === 0) return 'igual à média da cidade';
  return `${pontos}% ${lift > 1 ? 'mais' : 'menos'} que a média da cidade`;
}

/** Versão curta para caber em rótulo e cartão: "+18%" / "−30%". */
export function diferencaCurta(lift: number): string {
  const pontos = Math.round((lift - 1) * 100);
  return `${pontos >= 0 ? '+' : '−'}${Math.abs(pontos)}%`;
}

/**
 * Nomes de grupo da base para português corrente.
 *
 * A base usa dois formatos: "masculino 20-29" no perfil da consulta e "H 20-29"
 * na tabela por grupo. Os dois caem aqui.
 */
export function rotuloGrupo(grupo: string): string {
  const texto = grupo.trim();
  const masculino = /^(h|masculino)\b/i.test(texto);
  const feminino = /^(m|feminino)\b/i.test(texto);
  const faixa = texto.match(/(\d{2})\s*-\s*(\d{2})|(\d{2})\s*\+/);

  const quem = masculino ? 'Homens' : feminino ? 'Mulheres' : texto;
  if (!faixa) return quem;

  const idade = faixa[3] ? `${faixa[3]} anos ou mais` : `de ${faixa[1]} a ${faixa[2]} anos`;
  return `${quem} ${idade}`;
}

/** Versão curta do grupo, para eixo de gráfico: "Homens 20-29". */
export function rotuloGrupoCurto(grupo: string): string {
  const texto = grupo.trim();
  const quem = /^(h|masculino)\b/i.test(texto) ? 'Homens' : /^(m|feminino)\b/i.test(texto) ? 'Mulheres' : texto;
  const faixa = texto.replace(/^(h|m|masculino|feminino)\s*/i, '');
  return `${quem} ${faixa}`.trim();
}

/**
 * O intervalo de confiança cruza a base? Se cruza, a diferença daquele grupo
 * pode ser zero, e afirmar que ele compra mais é afirmar o que não se sabe.
 */
export function diferencaConfiavel(g: GrupoLift): boolean {
  const [minimo, maximo] = g.lift_ic90;
  return (minimo > 1 && maximo > 1) || (minimo < 1 && maximo < 1);
}

/** Onde o modelo aparece, em linguagem de frase. */
const ONDE: Record<string, string> = {
  'renda|renda>5SM': 'em cidades com mais gente de renda alta',
  'renda|renda<=1/2SM': 'em cidades com mais gente de renda muito baixa',
  'situacao|rural': 'em cidades com mais população rural',
  'escolaridade|esc:superior': 'em cidades com mais adultos formados na faculdade',
};

/** O mesmo assunto em forma de substantivo, para a frase de "sem evidência". */
const TEMA: Record<string, string> = {
  'renda|renda>5SM': 'renda alta na cidade',
  'renda|renda<=1/2SM': 'renda muito baixa na cidade',
  'situacao|rural': 'população rural',
  'escolaridade|esc:superior': 'escolaridade superior na cidade',
};

export interface LeituraEfeito {
  texto: string;
  /** false quando a base não distingue o efeito de zero — não serve de argumento. */
  conclusivo: boolean;
}

/**
 * Transforma o efeito por desvio padrão numa frase.
 *
 * O sentido do efeito é afirmado; a magnitude em "% por desvio padrão" não vai
 * para a tela porque exigiria explicar desvio padrão no meio da reunião. Quem
 * precisa do número encontra no detalhe técnico e no PDF.
 */
export function leituraDoEfeito(e: EfeitoContexto): LeituraEfeito {
  const onde = ONDE[e.controle];
  const tema = TEMA[e.controle] ?? e.descricao;

  if (!e.distinguivel_de_zero) {
    return { texto: `Sem evidência de relação com ${tema}.`, conclusivo: false };
  }

  const direcao = e.efeito_pct_por_dp >= 0 ? 'mais' : 'menos';
  return {
    texto: onde
      ? `Aparece ${direcao} ${onde}.`
      : `Aparece ${direcao} conforme ${tema}.`,
    conclusivo: true,
  };
}

/** Aviso metodológico em uma frase, no lugar do parágrafo técnico da base. */
export const COMO_LER =
  'Estes números vêm da frota que já circula no estado de São Paulo, agrupada por ' +
  'cidade, faixa de idade e gênero. Servem para dimensionar mercado e escolher ' +
  'região — não para prever o que um cliente específico vai comprar.';

export interface DadosDoResumo {
  localidade: string;
  grupo: string;
  lider: { modelo: string; sharePerfilPct: number; lift: number };
  maiorPreferencia: { modelo: string; sharePerfilPct: number; lift: number } | null;
  leituras: LeituraEfeito[];
}

/**
 * Parágrafo pronto para o slide, sem uma palavra de jargão.
 *
 * A ordem das frases é a da reunião: o que é mais comum, se isso é de fato
 * preferência do grupo, onde está a aposta e o que explica. A ressalva fecha o
 * texto porque ele vai ser copiado e colado fora do painel, sem o rodapé.
 */
export function resumoExecutivo(d: DadosDoResumo): string {
  const quem = rotuloGrupo(d.grupo).toLowerCase();
  const partes: string[] = [
    `Em ${d.localidade}, entre ${quem}, o carro mais comum é o ${d.lider.modelo}: ` +
      `${frequenciaLegivel(d.lider.sharePerfilPct)} do grupo.`,
  ];

  // A distinção que o painel inteiro existe para mostrar: ser o mais comum não é
  // ser o preferido. O carro mais popular do estado lidera quase todo recorte.
  partes.push(
    d.lider.lift > 1
      ? `E é preferência real do grupo: aparece ${diferencaLegivel(d.lider.lift)}.`
      : `Não é preferência do grupo, é onipresença do modelo: aparece ` +
        `${diferencaLegivel(d.lider.lift)}.`,
  );

  const aposta = d.maiorPreferencia;
  if (aposta && aposta.modelo !== d.lider.modelo) {
    partes.push(
      `A aposta do grupo é o ${aposta.modelo}: ${diferencaLegivel(aposta.lift)}, ` +
        `mesmo sendo menos frequente (${frequenciaLegivel(aposta.sharePerfilPct)}).`,
    );
  }

  const conclusiva = d.leituras.find((l) => l.conclusivo);
  if (conclusiva) {
    partes.push(`O que mais explica: ${minuscula(conclusiva.texto)}`);
  }

  partes.push(COMO_LER);
  return partes.join(' ');
}

function minuscula(frase: string): string {
  return frase.charAt(0).toLowerCase() + frase.slice(1);
}
