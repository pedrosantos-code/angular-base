import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { FONTE_VEICULOS, fonteFordApi } from './shared/fonte-veiculos';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
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
