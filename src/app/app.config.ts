import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { FONTE_VEICULOS, fonteFordApi } from './shared/fonte-veiculos';
import { FONTE_AFINIDADE, fonteApiPessoas } from './shared/fonte-afinidade';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // anchorScrolling faz a rota /portal#agente rolar até a seção do agente.
    // Sem isso, o item "Agente de IA" da gaveta abriria o portal no topo.
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    provideHttpClient(),

    /**
     * Fonte de afinidade do Agente de Perfil (/portal) — a base que responde
     * "o que este perfil demográfico já dirige".
     *
     * Era a API de carros; passou a ser a API Pessoas, que publica registro de
     * frota por perfil no estado de São Paulo. A troca custou esta linha: o
     * componente fala só com o token, nunca com a API.
     */
    { provide: FONTE_AFINIDADE, useFactory: fonteApiPessoas },

    /**
     * Fonte secundária: ficha técnica de veículo, usada pelo Dashboard e, no
     * agente, só para os modelos que existem nas duas bases.
     */
    { provide: FONTE_VEICULOS, useFactory: fonteFordApi },
  ],
};
