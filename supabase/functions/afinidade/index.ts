/**
 * ============================================================================
 * Edge Function: afinidade
 * ============================================================================
 *
 * Ponte entre o Agente de Perfil (/portal) e a API Pessoas.
 *
 * Por que existe: a API Pessoas não manda header CORS nenhum e responde 405 no
 * preflight OPTIONS. Chamada direto do Angular, o navegador bloqueia toda
 * requisição antes mesmo dela sair. Então quem chama é o servidor, e o navegador
 * fala só com esta função — que devolve CORS corretamente.
 *
 * É um proxy de lista fixa, não um proxy aberto: `operacao` só aceita os cinco
 * nomes abaixo e os parâmetros são remontados um a um. Ninguém consegue usar a
 * função para alcançar outro host ou outra rota.
 *
 * Rodar local:
 *   supabase functions serve afinidade
 *
 * Publicar:
 *   supabase functions deploy afinidade --no-verify-jwt
 *
 * O --no-verify-jwt é necessário para o preflight OPTIONS passar pelo gateway;
 * a checagem de sessão continua acontecendo aqui dentro, em getUser().
 */

import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const BASE = 'https://api-pessoas.azurewebsites.net';

/** Teto por requisição. A API roda em Azure com cold start; abaixo disso dá falso negativo. */
const TIMEOUT_MS = 25_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Parâmetros aceitos por operação. Só o que está listado aqui é repassado —
 * qualquer chave extra que chegue no corpo é descartada em silêncio.
 */
const OPERACOES: Record<string, { rota: (p: Record<string, string>) => string; parametros: string[] }> = {
  ranking: {
    rota: () => '/afinidade/ranking',
    parametros: [
      'genero', 'idade', 'municipio', 'regiao',
      'renda_per_capita_sm', 'escolaridade', 'area', 'top', 'metodo',
    ],
  },
  modelo: {
    // O nome vai no caminho, então é codificado e nunca concatenado cru.
    rota: (p) => `/afinidade/modelos/${encodeURIComponent(p['nome'] ?? '')}`,
    parametros: [],
  },
  municipios: { rota: () => '/afinidade/municipios', parametros: ['q'] },
  regioes: { rota: () => '/afinidade/regioes', parametros: [] },
  info: { rota: () => '/afinidade/info', parametros: [] },
};

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405);

  try {
    // ---- Sessão ----------------------------------------------------------
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ erro: 'Faça login para consultar a base de afinidade.' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: usuario, error: erroAuth } = await supabase.auth.getUser(jwt);
    if (erroAuth || !usuario?.user) {
      return json({ erro: 'Sua sessão expirou. Faça login de novo.' }, 401);
    }

    // ---- Operação --------------------------------------------------------
    const corpo = await req.json().catch(() => null);
    const nomeOperacao = String(corpo?.operacao ?? '');
    const operacao = OPERACOES[nomeOperacao];
    if (!operacao) {
      return json(
        { erro: `Operação desconhecida. Disponíveis: ${Object.keys(OPERACOES).join(', ')}.` },
        400,
      );
    }

    const recebidos: Record<string, string> = {};
    for (const [chave, valor] of Object.entries(corpo?.parametros ?? {})) {
      if (valor !== null && valor !== undefined && valor !== '') recebidos[chave] = String(valor);
    }

    const url = new URL(BASE + operacao.rota(recebidos));
    for (const nome of operacao.parametros) {
      if (recebidos[nome] !== undefined) url.searchParams.set(nome, recebidos[nome]);
    }

    // ---- Chamada ---------------------------------------------------------
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), TIMEOUT_MS);

    let resposta: Response;
    try {
      resposta = await fetch(url, { headers: { Accept: 'application/json' }, signal: controle.signal });
    } catch (e) {
      const abortou = e instanceof Error && e.name === 'AbortError';
      return json(
        {
          erro: abortou
            ? 'A API Pessoas não respondeu em 25s. Ela hiberna quando fica sem uso — tente de novo.'
            : 'Não foi possível alcançar a API Pessoas.',
        },
        504,
      );
    } finally {
      clearTimeout(relogio);
    }

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
      // O 422 do FastAPI vem com o motivo em `detail` — repassar ajuda a corrigir o input.
      const detalhe = typeof dados?.detail === 'string' ? dados.detail : null;
      return json(
        { erro: detalhe ?? `A API Pessoas respondeu ${resposta.status}.`, status: resposta.status },
        resposta.status === 422 ? 422 : 502,
      );
    }

    return json(dados);
  } catch (e) {
    return json({ erro: e instanceof Error ? e.message : 'Falha inesperada no proxy.' }, 500);
  }
});
