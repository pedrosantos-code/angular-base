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

/** Par título + texto, repetido em riscos e argumentos. */
const itemComTitulo = (descricao: string) => ({
  type: 'array',
  description: descricao,
  items: {
    type: 'object',
    properties: { titulo: { type: 'string' }, texto: { type: 'string' } },
    required: ['titulo', 'texto'],
    additionalProperties: false,
  },
});

const ESQUEMA_INSIGHTS = {
  type: 'object',
  properties: {
    veredito: { type: 'string', description: 'Uma frase dizendo se o ranking faz sentido comercialmente para este perfil.' },
    concordaComRanking: { type: 'boolean', description: 'true se o modelo líder é de fato a melhor recomendação comercial.' },
    leituraPerfil: { type: 'string', description: 'O que este perfil significa na prática para o vendedor, em 2 a 3 frases.' },
    riscos: itemComTitulo('Riscos concretos de recomendar o modelo líder para este cliente.'),
    argumentosVenda: itemComTitulo('Argumentos que o vendedor pode usar, ancorados nos dados recebidos.'),
    perguntasDoGestor: {
      type: 'array',
      description: 'Perguntas que um gestor provavelmente faria na reunião, com a resposta baseada nos dados.',
      items: {
        type: 'object',
        properties: { pergunta: { type: 'string' }, resposta: { type: 'string' } },
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
const SISTEMA = `Você é analista de inteligência comercial de uma concessionária Ford.
Recebe o resultado de um motor de recomendação determinístico e ajuda o time a usá-lo
numa reunião com gestores.

REGRAS DE ANCORAGEM — as mais importantes:
- Use exclusivamente os dados do JSON que você recebe. Não invente números, modelos,
  preços, especificações, participações de mercado ou datas.
- Se um dado necessário não está no JSON, diga explicitamente que ele não está
  disponível. Nunca estime para preencher a lacuna.
- Share de mercado, posição de vendas e drivers de preferência são ESTIMATIVA INTERNA,
  não dado real de emplacamento. Sempre que citá-los, deixe essa condição clara.
- Ficha técnica (potência, medidas, tanque) é dado real da API. Pode tratar como fato.
- Onde a ficha vier nula, o dado não é publicado pela API. Diga isso; não estime.

POSTURA:
- Você pode discordar do ranking. Se o modelo líder for uma má recomendação comercial,
  diga e explique. Concordar por educação não ajuda ninguém.
- Seja concreto e direto. Nada de generalidade de folheto.
- Português do Brasil, tom profissional e sóbrio.`;

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

Responda de forma direta e ancorada nos dados acima. Se os dados não permitirem
responder, diga o que faltaria.`,
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
