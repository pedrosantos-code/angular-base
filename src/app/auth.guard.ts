import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Bloqueia páginas internas para quem não está logado e manda para o login. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return (await auth.temSessao()) ? true : router.createUrlTree(['/login']);
};
