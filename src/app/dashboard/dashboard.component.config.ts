import { ApplicationConfig} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './dashboard.component.routes';

export const dashboardConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};
