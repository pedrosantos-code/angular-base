import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { LoginComponent } from './login/login.component';
import { CadastroComponent } from './cadastro/cadastro.component';
import { PortalComponent } from './portal/portal.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ModelosComponent } from './modelos/modelos.component';
import { SobreIaComponent } from './sobre-ia/sobre-ia.component';
import { AgendamentosComponent } from './agendamentos/agendamentos.component';
import { ConcessionariasComponent } from './concessionarias/concessionarias.component';
import { PerfilComponent } from './perfil/perfil.component';
import { FaleConoscoComponent } from './fale-conosco/fale-conosco.component';
import { TermosComponent } from './termos/termos.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
    // Públicas
    { path: '', component: LandingComponent },
    { path: 'login', component: LoginComponent },
    { path: 'cadastro', component: CadastroComponent },
    { path: 'sobre-ia', component: SobreIaComponent },
    { path: 'termos', component: TermosComponent },

    // Exigem login
    { path: 'portal', component: PortalComponent, canActivate: [authGuard] },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'modelos', component: ModelosComponent, canActivate: [authGuard] },
    { path: 'agendamentos', component: AgendamentosComponent, canActivate: [authGuard] },
    { path: 'concessionarias', component: ConcessionariasComponent, canActivate: [authGuard] },
    { path: 'fale-conosco', component: FaleConoscoComponent, canActivate: [authGuard] },
    { path: 'perfil', component: PerfilComponent, canActivate: [authGuard] }
];
