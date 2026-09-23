import { InjectionToken, inject } from '@angular/core';
import {
  ApiPessoasService, ConsultaAfinidade, ModeloDetalhe, MunicipioApi,
  RankingCosseno, RankingRegressao,
} from './api-pessoas.service';

/**
 * Contrato de origem dos dados de afinidade do Agente de Perfil.
 *
 * O agente nunca fala com a API direto — ele pede os dados por aqui. Trocar de
 * API é escrever um objeto com estes membros e mudar uma linha no app.config.ts;
 * nenhum componente precisa ser tocado. Foi por esse encaixe que a troca da API
 * de carros para a API Pessoas não exigiu mexer na tela.
 */
export interface FonteAfinidade {
  /** Nome exibido no rodapé do painel, para o analista saber de onde veio o número. */
  readonly nome: string;

  /** Ranking por participação e lift sobre a média local. */
  ranking(consulta: ConsultaAfinidade): Promise<RankingRegressao>;

  /** Ranking por semelhança de perfil, com os fatores que explicam. */
  rankingCaracteristico(consulta: ConsultaAfinidade): Promise<RankingCosseno>;

  /** Efeitos com intervalo de confiança e lift por grupo demográfico. */
  detalheModelo(nome: string): Promise<ModeloDetalhe>;

  /** Autocomplete de município. */
  municipios(q: string): Promise<MunicipioApi[]>;
}

export const FONTE_AFINIDADE = new InjectionToken<FonteAfinidade>('FONTE_AFINIDADE');

/** Fonte atual: API Pessoas, atravessando a Edge Function `afinidade`. */
export function fonteApiPessoas(): FonteAfinidade {
  const api = inject(ApiPessoasService);

  return {
    nome: api.nome,
    ranking: (consulta) => api.rankingPorRegressao(consulta),
    rankingCaracteristico: (consulta) => api.rankingPorCosseno(consulta),
    detalheModelo: (nome) => api.detalheModelo(nome),
    municipios: (q) => api.municipios(q),
  };
}

/**
 * Fonte vazia para testes: devolve resposta bem formada e sem dados, então o
 * painel monta a tela inteira sem tocar a rede nem consumir a API.
 */
export function fonteAfinidadeVazia(nome = 'Sem fonte de afinidade configurada'): FonteAfinidade {
  const perfilVazio = {
    genero: 'masculino',
    idade: 30,
    grupo: 'masculino 30-39',
    localidade: { tipo: 'estado', nome: 'São Paulo' },
    ajustes_de_contexto: [],
    extraido_nlp: null,
  };

  return {
    nome,
    ranking: async () => ({ metodo: 'regressao', perfil: perfilVazio, aviso: '', ranking: [] }),
    rankingCaracteristico: async () => ({
      metodo: 'cosseno', peso_demografico: 0.25, perfil: perfilVazio, aviso: '', ranking: [],
    }),
    detalheModelo: async () => ({
      modelo: '', frota_pf_por_adulto_media: 0, efeitos_contexto: [], grupos: [],
    }),
    municipios: async () => [],
  };
}
