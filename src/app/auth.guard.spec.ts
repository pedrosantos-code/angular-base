import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  function executar(temSessao: boolean): Promise<boolean | UrlTree> {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { temSessao: async () => temSessao } }],
    });
    return TestBed.runInInjectionContext(
      () => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Promise<boolean | UrlTree>;
  }

  it('libera a rota quando há sessão', async () => {
    expect(await executar(true)).toBe(true);
  });

  it('manda para /login quando não há sessão', async () => {
    const resultado = await executar(false);
    const router = TestBed.inject(Router);
    expect(resultado).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(resultado as UrlTree)).toBe('/login');
  });
});
