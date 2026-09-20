import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthResponse, createClient } from '@supabase/supabase-js'
import { environment } from '../environments/environment';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private router = inject(Router);

    supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    register(email: string, password: string, nome?: string, idade?: number, genero?: string): Observable<AuthResponse> {
        const promise = this.supabase.auth.signUp({
            email,
            password,
            options: { data: { nome, idade, genero } },
        });
        return from(promise);
    }

    login(email: string, password: string): Observable<AuthResponse> {
        const promise = this.supabase.auth.signInWithPassword({ email, password });
        return from(promise);
    }

    /** Encerra a sessão no Supabase (limpa o token do navegador) e volta para a página inicial. */
    async logout(): Promise<void> {
        try {
            await this.supabase.auth.signOut();
        } finally {
            await this.router.navigateByUrl('/');
        }
    }

    /** Há uma sessão ativa? Usado pelo guard de rotas. */
    async temSessao(): Promise<boolean> {
        const { data } = await this.supabase.auth.getSession();
        return !!data.session;
    }

    // Pega o e-mail que o Supabase deixou salvo na sessão
    getCurrentUserEmail(): Observable<string> {
        const promise = this.supabase.auth.getUser();
        return from(promise).pipe(
            map(response => response.data.user?.email || '')
        );
    }
}
