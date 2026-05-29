import { ApplicationConfig} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './home.component.routes';

export const homeConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};
