import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

/**
 * Cliente da Edge Function `analise-ia`.
 *
 * A chave da Anthropic nunca passa por aqui: o Angular só manda o resultado já
 * calculado e o token da sessão, e a função no Supabase é quem fala com a API.
 * Ver supabase/functions/analise-ia/index.ts.
 */

export interface ItemInsight {
  titulo: string;
  texto: string;
}

export interface PerguntaRespondida {
  pergunta: string;
  resposta: string;
}

export interface Insights {
  veredito: string;
  concordaComRanking: boolean;
  leituraPerfil: string;
  riscos: ItemInsight[];
  argumentosVenda: ItemInsight[];
  perguntasDoGestor: PerguntaRespondida[];
}

/** Erro já traduzido para algo que dá para mostrar na tela. */
export class AnaliseIaError extends Error {}

@Injectable({ providedIn: 'root' })
export class AnaliseIaService {
  private auth = inject(AuthService);

  private readonly url = `${environment.supabaseUrl}/functions/v1/analise-ia`;

  /** true quando a Edge Function foi configurada — evita mostrar o bloco de IA sem backend. */
  get configurada(): boolean {
    return !environment.supabaseUrl.includes('placeholder');
  }

  async gerarInsights(analise: unknown): Promise<Insights> {
    return await this.chamar<Insights>({ modo: 'insights', analise });
  }

  async perguntar(analise: unknown, pergunta: string): Promise<string> {
    const r = await this.chamar<{ texto: string }>({ modo: 'pergunta', analise, pergunta });
    return r.texto;
  }

  private async chamar<T>(corpo: Record<string, unknown>): Promise<T> {
    const { data } = await this.auth.supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new AnaliseIaError('Sua sessão expirou. Faça login de novo.');

    let resposta: Response;
    try {
      resposta = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(corpo),
      });
    } catch {
      // Causa mais comum em dev: a função não foi publicada nem está servindo local.
      throw new AnaliseIaError(
        'Não foi possível falar com a função de IA. Confira se ela está publicada no Supabase.',
      );
    }

    const json = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      throw new AnaliseIaError(json?.erro ?? `A função respondeu ${resposta.status}.`);
    }
    return json as T;
  }
}
