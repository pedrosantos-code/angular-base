/**
 * ============================================================================
 * Edge Function: analise-ia
 * ============================================================================
 *
 * Ponte entre o Agente de Perfil (/portal) e a API da Anthropic.
 *
 * Ela existe por um motivo de segurança: o Angular roda no navegador, e qualquer
 * chave embutida ali fica visível no DevTools. A chave mora aqui, como segredo da
 * função, e nunca chega ao cliente.
 *
 * A função também recusa quem não está logado no Supabase, para que só analistas
 * autenticados consumam o crédito da API.
 *
 * Segredo necessário:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *
 * Rodar local:
 *   supabase functions serve analise-ia --env-file supabase/functions/.env.local
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.127.0';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

/**
 * Modelo e esforço escolhidos por custo: o Opus 5 rendia ~57 análises com US$ 5,
 * contra ~200 nesta combinação. Subir para claude-opus-5 ou para effort 'high'
 * aumenta a profundidade e o gasto na mesma proporção.
 */
const MODELO = 'claude-sonnet-5';

/** low | medium | high | xhigh | max — controla quanto o modelo raciocina antes de responder. */
const ESFORCO = 'medium' as const;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------------------
// Formato da resposta de insights
// ---------------------------------------------------------------------------

/**
 * Par título + texto, repetido em riscos e argumentos.
 *
 * Os limites de tamanho estão na descrição de propósito: sem eles o modelo escreve
 * parágrafos que ninguém lê numa reunião, e o PDF de resumo estoura de página.
 */
const itemComTitulo = (descricao: string) => ({
  type: 'array',
  description: `${descricao} No máximo 3 itens, ordenados do mais relevante para o menos.`,
  items: {
    type: 'object',
    properties: {
      titulo: { type: 'string', description: 'Rótulo de 2 a 5 palavras. Sem verbo, sem frase.' },
      texto: { type: 'string', description: 'Uma frase acionável, no máximo 25 palavras. Cite o número quando houver.' },
    },
    required: ['titulo', 'texto'],
    additionalProperties: false,
  },
});

const ESQUEMA_INSIGHTS = {
  type: 'object',
  properties: {
    veredito: {
      type: 'string',
      description: 'A conclusão, em uma frase de no máximo 20 palavras. Comece pela recomendação, não pelo contexto.',
    },
    concordaComRanking: { type: 'boolean', description: 'true se o modelo líder é de fato a melhor recomendação comercial.' },
    leituraPerfil: {
      type: 'string',
      description: 'O que este perfil muda na abordagem de venda. No máximo 2 frases, 40 palavras no total.',
    },
    riscos: itemComTitulo('O que pode dar errado ao recomendar o modelo líder para este cliente.'),
    argumentosVenda: itemComTitulo('Argumentos de venda ancorados nos dados recebidos.'),
    perguntasDoGestor: {
      type: 'array',
      description: 'Perguntas que um gestor faria na reunião. No máximo 3.',
      items: {
        type: 'object',
        properties: {
          pergunta: { type: 'string', description: 'A pergunta como um gestor a faria. Direta, no máximo 15 palavras.' },
          resposta: { type: 'string', description: 'Resposta com o número na frente. No máximo 30 palavras.' },
        },
        required: ['pergunta', 'resposta'],
        additionalProperties: false,
      },
    },
  },
  required: ['veredito', 'concordaComRanking', 'leituraPerfil', 'riscos', 'argumentosVenda', 'perguntasDoGestor'],
  additionalProperties: false,
};

// ---------------------------------------------------------------------------
// Instruções do modelo
// ---------------------------------------------------------------------------

/**
 * A regra de ancoragem é a parte mais importante deste arquivo. Sem ela, o modelo
 * preenche lacunas com números plausíveis e inventados, que acabam num slide
 * executivo sem ninguém perceber.
 */
const SISTEMA = `Você é analista de inteligência de mercado automotivo.
Recebe o resultado de uma consulta de afinidade por perfil demográfico e ajuda o time
a usá-lo numa reunião com gestores.

O QUE OS NÚMEROS SÃO — leia antes de escrever qualquer frase:
- A base é registro de frota de pessoa física no estado de São Paulo, agregado por
  município e por grupo de gênero e faixa de idade. Mede o que já está rodando,
  não intenção de compra e não venda nova.
- \`share_perfil_pct\` é a participação do modelo na frota do grupo. \`share_municipio_pct\`
  é a participação na frota do município inteiro.
- \`lift\` compara os dois e tem base 1. Acima de 1, o grupo escolhe mais que a praça;
  abaixo de 1, escolhe menos. É o número que diferencia um perfil do outro.
- O líder de share costuma ser apenas o carro mais comum do estado. Se o lift dele for
  menor que 1, diga isso: liderar a frota do grupo sem sobre-indexar não é preferência
  do perfil, é onipresença do modelo.
- \`cosseno\` mede semelhança entre o perfil e o perfil típico do modelo. Não é
  probabilidade e não soma 100%.
- \`efeitos_contexto\` traz efeito por desvio padrão com \`ic90_pct\`. Quando
  \`distinguivel_de_zero\` é false, o intervalo cruza o zero: esse efeito NÃO sustenta
  afirmação nenhuma. Nunca use um efeito inconclusivo como argumento.
- \`grupos\` traz lift por grupo com \`lift_ic90\`. Se os intervalos de dois grupos se
  sobrepõem, a base não distingue os dois. Não afirme diferença entre eles.

REGRAS DE ANCORAGEM — as mais importantes:
- Use exclusivamente os dados do JSON que você recebe. Não invente números, modelos,
  especificações ou datas.
- A base NÃO publica preço, parcela, orçamento nem margem. Se a pergunta depender de
  preço, diga na primeira frase que este dado não está na base e aponte o que faltaria.
  Nunca estime valor de carro.
- Nada aqui é probabilidade individual. O campo \`avisoMetodologico\` é a palavra da
  própria base: são taxas médias de grupo por município, boas para dimensionar mercado
  e escolher região, não para decidir a oferta a um cliente específico. Não escreva
  frases do tipo "este cliente vai comprar X".
- A cobertura é o estado de São Paulo. Não generalize para o Brasil.
- Se um dado necessário não está no JSON, diga explicitamente que não está disponível.
  Nunca estime para preencher a lacuna.
- \`fichaTecnicaQuandoExiste\` é dado real de outra base e só cobre parte dos modelos.
  Onde vier vazio ou nulo, o dado não é publicado. Diga isso; não estime.

POSTURA:
- Você pode discordar do ranking. Se o líder de share for uma leitura comercial ruim,
  diga e explique. Concordar por educação não ajuda ninguém.
- Português do Brasil, tom profissional e sóbrio.

ESTILO — isto é leitura para reunião de diretoria, não relatório:
- Frases curtas e afirmativas. Uma ideia por frase.
- Número na frente do adjetivo. "lift 1,18, 18% acima da praça" vale mais que
  "afinidade relativamente alta".
- Sem preâmbulo, sem recapitular o que foi perguntado, sem fechamento cerimonioso.
  Comece pela conclusão.
- Corte hedge: nada de "é importante notar", "vale ressaltar", "de modo geral",
  "pode-se dizer". Se você tem a informação, afirme. Se não tem, diga que não tem.
- Zero linguagem de folheto: "versatilidade", "experiência única", "custo-benefício"
  sozinhos não significam nada. Diga o que muda na decisão.
- Cada risco e cada argumento é acionável: o que fazer ou o que checar, não uma
  observação genérica.
- Respeite os limites de tamanho que o formato pedir. Prolixidade aqui é defeito.`;

function promptDaAnalise(analise: unknown): string {
  return `Resultado da análise:

\`\`\`json
${JSON.stringify(analise, null, 2)}
\`\`\``;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  try {
    if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405);

    // --- Autenticação: só usuário logado no Supabase ---
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ erro: 'Faça login para usar a análise por IA.' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: usuario, error: erroAuth } = await supabase.auth.getUser(jwt);
    if (erroAuth || !usuario?.user) {
      return json({ erro: 'Sessão inválida ou expirada. Faça login de novo.' }, 401);
    }

    // --- Chave da API ---
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return json({ erro: 'ANTHROPIC_API_KEY não está configurada nesta função.' }, 500);
    }

    // --- Corpo ---
    const { modo, analise, pergunta } = await req.json();
    if (!analise) return json({ erro: 'Campo "analise" é obrigatório.' }, 400);
    if (modo === 'pergunta' && !pergunta?.trim()) {
      return json({ erro: 'Campo "pergunta" é obrigatório no modo pergunta.' }, 400);
    }

    const client = new Anthropic({ apiKey });

    const comuns = {
      model: MODELO,
      max_tokens: 16000,
      system: SISTEMA,
      thinking: { type: 'adaptive' as const },
      output_config: { effort: ESFORCO },
    };

    /** Junta os blocos de texto da resposta, ignorando os blocos de raciocínio. */
    const textoDe = (r: { content: Array<{ type: string; text?: string }> }) =>
      r.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n').trim();

    // --- Modo pergunta: texto corrido ---
    if (modo === 'pergunta') {
      const resposta = await client.messages.create({
        ...comuns,
        messages: [{
          role: 'user',
          content: `${promptDaAnalise(analise)}

Pergunta do analista: ${pergunta}

Responda em no máximo 4 frases. Comece pela resposta, não pelo contexto. Cite os
números que sustentam o que você diz. Se os dados não permitirem responder, diga
isso na primeira frase e aponte o que faltaria.`,
        }],
      });

      if (resposta.stop_reason === 'refusal') {
        return json({ erro: 'O modelo recusou responder a essa solicitação.' }, 422);
      }
      return json({ modo: 'pergunta', texto: textoDe(resposta), uso: resposta.usage });
    }

    // --- Modo insights: resposta estruturada em seções ---
    const resposta = await client.messages.create({
      ...comuns,
      messages: [{
        role: 'user',
        content: `${promptDaAnalise(analise)}

Produza a leitura executiva desta análise seguindo o formato pedido.`,
      }],
      // O effort vem de `comuns`; repetir a chave inteira aqui o descartaria.
      output_config: { ...comuns.output_config, format: { type: 'json_schema', schema: ESQUEMA_INSIGHTS } },
    });

    if (resposta.stop_reason === 'refusal') {
      return json({ erro: 'O modelo recusou responder a essa solicitação.' }, 422);
    }

    const bruto = textoDe(resposta);
    let estruturado: Record<string, unknown>;
    try {
      estruturado = JSON.parse(bruto);
    } catch {
      console.error('Resposta fora do formato:', bruto.slice(0, 500));
      return json({ erro: 'O modelo não devolveu a resposta no formato esperado.' }, 502);
    }

    return json({ modo: 'insights', ...estruturado, uso: resposta.usage });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('analise-ia falhou:', msg);
    return json({ erro: `Falha ao consultar a IA: ${msg}` }, 500);
  }
});
