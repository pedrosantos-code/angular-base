import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

/**
 * Cliente da API Pessoas (afinidade de modelo por perfil demográfico).
 *
 * Não fala com a API direto: a API Pessoas não publica header CORS nenhum e
 * responde 405 no preflight, então o navegador bloquearia a chamada. O caminho
 * é a Edge Function `afinidade`, que faz a requisição do lado do servidor.
 * Ver supabase/functions/afinidade/index.ts.
 *
 * Os tipos abaixo são transcrição do /openapi.json da API — nada é inventado aqui.
 */

// ---------------------------------------------------------------------------
// Contratos da API
// ---------------------------------------------------------------------------

/** Ajuste aplicado ao perfil por um controle socioeconômico do município. */
export interface AjusteContexto {
  controle: string;
  motivo: string;
  valor_pct: number;
}

export interface PerfilApi {
  genero: string;
  idade: number;
  grupo: string;
  localidade: { tipo: string; nome: string };
  ajustes_de_contexto: AjusteContexto[];
  extraido_nlp: unknown | null;
}

/** Item do ranking por regressão: participação e lift sobre a média do município. */
export interface ItemRanking {
  modelo: string;
  share_perfil_pct: number;
  share_municipio_pct: number;
  /** >1 = o grupo escolhe mais que a média local; <1 = escolhe menos. */
  lift: number;
}

export interface FatorCosseno {
  caracteristica: string;
  sentido: string;
  contribuicao: number;
}

/** Item do ranking por cosseno: o quanto o modelo é característico do perfil. */
export interface ItemCosseno {
  modelo: string;
  cosseno: number;
  cos_demografia: number;
  cos_contexto: number;
  share_estado_pct: number;
  principais_fatores: FatorCosseno[];
}

export interface RankingRegressao {
  metodo: string;
  perfil: PerfilApi;
  aviso: string;
  ranking: ItemRanking[];
}

export interface RankingCosseno {
  metodo: string;
  peso_demografico: number;
  perfil: PerfilApi;
  aviso: string;
  ranking: ItemCosseno[];
}

/** Efeito de um controle sobre a frota do modelo, com intervalo de confiança de 90%. */
export interface EfeitoContexto {
  controle: string;
  descricao: string;
  efeito_pct_por_dp: number;
  ic90_pct: [number, number];
  /** false = o intervalo cruza o zero, então o efeito não é estatisticamente distinguível. */
  distinguivel_de_zero: boolean;
}

export interface GrupoLift {
  grupo: string;
  lift: number;
  mix_pct: number;
  lift_ic90: [number, number];
}

export interface ModeloDetalhe {
  modelo: string;
  frota_pf_por_adulto_media: number;
  efeitos_contexto: EfeitoContexto[];
  grupos: GrupoLift[];
}

export interface MunicipioApi {
  cod_ibge: number;
  municipio: string;
}

export interface InfoAfinidade {
  uf: string;
  municipios: number;
  grupos: string[];
  modelos: string[];
  metodos: string[];
  aviso: string;
}

/** Parâmetros aceitos pelo ranking. `genero` e `idade` são obrigatórios na API. */
export interface ConsultaAfinidade {
  genero: 'masculino' | 'feminino';
  idade: number;
  municipio?: string | null;
  regiao?: string | null;
  renda_per_capita_sm?: number | null;
  escolaridade?: string | null;
  area?: string | null;
  top?: number;
}

/** Erro já traduzido para algo que dá para mostrar na tela. */
export class ApiPessoasError extends Error {}

@Injectable({ providedIn: 'root' })
export class ApiPessoasService {
  private auth = inject(AuthService);

  private readonly url = `${environment.supabaseUrl}/functions/v1/afinidade`;

  readonly nome = 'API Pessoas — afinidade por perfil (registro de frota, SP)';

  get configurada(): boolean {
    return !environment.supabaseUrl.includes('placeholder');
  }

  /** Ranking por regressão ecológica: share do perfil, share do município e lift. */
  rankingPorRegressao(consulta: ConsultaAfinidade): Promise<RankingRegressao> {
    return this.chamar<RankingRegressao>('ranking', { ...consulta, metodo: 'regressao' });
  }

  /** Ranking por cosseno: o que é mais característico do perfil, com os fatores que explicam. */
  rankingPorCosseno(consulta: ConsultaAfinidade): Promise<RankingCosseno> {
    return this.chamar<RankingCosseno>('ranking', { ...consulta, metodo: 'cosseno' });
  }

  /** Detalhe estatístico de um modelo: efeitos com IC90 e lift por grupo demográfico. */
  detalheModelo(nome: string): Promise<ModeloDetalhe> {
    return this.chamar<ModeloDetalhe>('modelo', { nome });
  }

  /** Busca municípios por trecho do nome, para o autocomplete. */
  municipios(q: string): Promise<MunicipioApi[]> {
    return this.chamar<MunicipioApi[]>('municipios', { q });
  }

  info(): Promise<InfoAfinidade> {
    return this.chamar<InfoAfinidade>('info', {});
  }

  private async chamar<T>(operacao: string, parametros: Record<string, unknown>): Promise<T> {
    const { data } = await this.auth.supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new ApiPessoasError('Sua sessão expirou. Faça login de novo.');

    let resposta: Response;
    try {
      resposta = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ operacao, parametros }),
      });
    } catch {
      throw new ApiPessoasError(
        'Não foi possível falar com a função de afinidade. Confira se ela está publicada no Supabase.',
      );
    }

    const json = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      throw new ApiPessoasError(json?.erro ?? `A função respondeu ${resposta.status}.`);
    }
    return json as T;
  }
}
