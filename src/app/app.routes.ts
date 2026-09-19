import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

// Cada página é carregada só quando a rota é aberta (lazy loading), para o bundle inicial ficar pequeno.
export const routes: Routes = [
    // Públicas
    { path: '', loadComponent: () => import('./landing/landing.component').then(m => m.LandingComponent) },
    { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
    { path: 'cadastro', loadComponent: () => import('./cadastro/cadastro.component').then(m => m.CadastroComponent) },
    { path: 'sobre-ia', loadComponent: () => import('./sobre-ia/sobre-ia.component').then(m => m.SobreIaComponent) },
    { path: 'termos', loadComponent: () => import('./termos/termos.component').then(m => m.TermosComponent) },

    // Exigem login
    { path: 'portal', loadComponent: () => import('./portal/portal.component').then(m => m.PortalComponent), canActivate: [authGuard] },
    { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
    { path: 'modelos', loadComponent: () => import('./modelos/modelos.component').then(m => m.ModelosComponent), canActivate: [authGuard] },
    { path: 'agendamentos', loadComponent: () => import('./agendamentos/agendamentos.component').then(m => m.AgendamentosComponent), canActivate: [authGuard] },
    { path: 'concessionarias', loadComponent: () => import('./concessionarias/concessionarias.component').then(m => m.ConcessionariasComponent), canActivate: [authGuard] },
    { path: 'fale-conosco', loadComponent: () => import('./fale-conosco/fale-conosco.component').then(m => m.FaleConoscoComponent), canActivate: [authGuard] },
    { path: 'perfil', loadComponent: () => import('./perfil/perfil.component').then(m => m.PerfilComponent), canActivate: [authGuard] }
];
