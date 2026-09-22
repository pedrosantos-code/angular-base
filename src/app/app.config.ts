import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { FONTE_VEICULOS, fonteFordApi } from './shared/fonte-veiculos';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // anchorScrolling faz a rota /portal#agente rolar até a seção do agente.
    // Sem isso, o item "Agente de IA" da gaveta abriria o portal no topo.
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    provideHttpClient(),

    /**
     * Fonte de dados do Agente de Perfil (/portal).
     *
     * Hoje aponta para a mesma API que o Dashboard consome — combinado como
     * solução temporária. Para trocar de API, escreva outra factory que devolva
     * um FonteVeiculos e troque só esta linha: nenhum componente muda.
     */
    { provide: FONTE_VEICULOS, useFactory: fonteFordApi },
  ],
};
