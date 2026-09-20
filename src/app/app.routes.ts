import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

// Cada página é carregada só quando a rota é aberta (lazy loading), para o bundle inicial ficar pequeno.
export const routes: Routes = [
    // Públicas
    { path: '', loadComponent: () => import('./landing/landing.component').then(m => m.LandingComponent) },
    { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
    { path: 'cadastro', loadComponent: () => import('./cadastro/cadastro.component').then(m => m.CadastroComponent) },
    { path: 'sobre-ia', title: 'Como a IA decide · SEIA + Ford', loadComponent: () => import('./sobre-ia/sobre-ia.component').then(m => m.SobreIaComponent) },
    { path: 'termos', title: 'Termos e contratos · SEIA + Ford', loadComponent: () => import('./termos/termos.component').then(m => m.TermosComponent) },

    // Exigem login
    { path: 'portal', title: 'Recomendação · SEIA + Ford', loadComponent: () => import('./portal/portal.component').then(m => m.PortalComponent), canActivate: [authGuard] },
    { path: 'dashboard', title: 'Dashboard detalhado · SEIA + Ford', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
    { path: 'modelos', title: 'Modelos Ford · SEIA + Ford', loadComponent: () => import('./modelos/modelos.component').then(m => m.ModelosComponent), canActivate: [authGuard] },
    { path: 'agendamentos', title: 'Meus agendamentos · SEIA + Ford', loadComponent: () => import('./agendamentos/agendamentos.component').then(m => m.AgendamentosComponent), canActivate: [authGuard] },
    { path: 'concessionarias', title: 'Concessionárias · SEIA + Ford', loadComponent: () => import('./concessionarias/concessionarias.component').then(m => m.ConcessionariasComponent), canActivate: [authGuard] },
    { path: 'fale-conosco', title: 'Fale conosco · SEIA + Ford', loadComponent: () => import('./fale-conosco/fale-conosco.component').then(m => m.FaleConoscoComponent), canActivate: [authGuard] },
    { path: 'perfil', title: 'Meu perfil · SEIA + Ford', loadComponent: () => import('./perfil/perfil.component').then(m => m.PerfilComponent), canActivate: [authGuard] }
];
