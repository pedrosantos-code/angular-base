import { ApplicationConfig} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './cadastro.component.routes';

export const cadastroConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};
