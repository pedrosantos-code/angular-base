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

export const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'login', component: LoginComponent },
    { path: 'cadastro', component: CadastroComponent },
    { path: 'portal', component: PortalComponent },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'modelos', component: ModelosComponent },
    { path: 'sobre-ia', component: SobreIaComponent },
    { path: 'agendamentos', component: AgendamentosComponent },
    { path: 'concessionarias', component: ConcessionariasComponent },
    { path: 'fale-conosco', component: FaleConoscoComponent },
    { path: 'perfil', component: PerfilComponent },
    { path: 'termos', component: TermosComponent }
];
