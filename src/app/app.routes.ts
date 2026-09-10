import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { CadastroComponent } from './cadastro/cadastro.component';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ModelosComponent } from './modelos/modelos.component';
import { SobreiaComponent } from './sobreia/sobreia.component';
import { AgendamentosComponent } from './agendamentos/agendamentos.component';
import { ConcessionariasComponent } from './concessionarias/concessionarias.component';
import { PerfilComponent } from './perfil/perfil.component';
import { FaleconoscoComponent } from './faleconosco/faleconosco.component';
import { TermosComponent } from './termos/termos.component';

export const routes: Routes = [
    {path: '', component: LoginComponent},
    {path: 'cadastro', component: CadastroComponent},
    {path: 'home', component: HomeComponent},
    {path: 'dashboard', component: DashboardComponent},
    {path: 'modelos', component: ModelosComponent},
    {path: 'sobre-ia', component: SobreiaComponent},
    {path: 'agendamentos', component: AgendamentosComponent},
    {path: 'concessionarias', component: ConcessionariasComponent},
    {path: 'fale-conosco', component: FaleconoscoComponent},
    {path: 'perfil', component: PerfilComponent},
    {path: 'termos', component: TermosComponent}
];
