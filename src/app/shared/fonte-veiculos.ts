import { InjectionToken, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { Car, FordApiService } from '../ford-api.service';

/**
 * Contrato de origem dos dados de veículo usados pelo Agente de Perfil.
 *
 * O agente nunca fala com a API da Ford direto — ele pede os dados por aqui. Trocar
 * de API é escrever um novo objeto com esses dois membros e mudar uma linha no
 * app.config.ts; nenhum componente precisa ser tocado.
 */
export interface FonteVeiculos {
  /** Nome exibido no rodapé do painel, pra o analista saber de onde veio o número. */
  readonly nome: string;

  /** Busca variantes de um modelo pelo nome. Lista vazia = modelo não existe na base. */
  buscarPorModelo(modelo: string, limite?: number): Observable<Car[]>;
}

export const FONTE_VEICULOS = new InjectionToken<FonteVeiculos>('FONTE_VEICULOS');

/**
 * Fonte atual: a mesma API que o Dashboard consome. É a implementação temporária
 * combinada para a demonstração — ver o comentário do provider no app.config.ts.
 */
export function fonteFordApi(): FonteVeiculos {
  const api = inject(FordApiService);

  return {
    nome: 'API Ford (cars) — mesma base do Dashboard',
    buscarPorModelo: (modelo, limite = 8) =>
      api.listCars({ model: modelo, limit: limite }).pipe(map((resposta) => resposta.items)),
  };
}

/**
 * Fonte vazia, para quando a troca de API estiver em andamento ou em testes: o painel
 * continua montando o ranking e os textos, só sem a ficha técnica e sem o gráfico da API.
 */
export function fonteVazia(nome = 'Sem fonte configurada'): FonteVeiculos {
  return { nome, buscarPorModelo: () => of([]) };
}
