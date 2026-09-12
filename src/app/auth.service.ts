import { Injectable } from '@angular/core';
import { AuthResponse, createClient } from '@supabase/supabase-js'
import { environment } from '../environments/environment';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    register(email: string, password: string): Observable<AuthResponse> {
        const promise = this.supabase.auth.signUp({ email, password });
        return from(promise);
    }

    login(email: string, password: string): Observable<AuthResponse> {
        const promise = this.supabase.auth.signInWithPassword({ email, password });
        return from(promise);
    }

    // ADICIONE ESTE MÉTODO: Ele pega o e-mail que o Supabase deixou salvo na sessão
    getCurrentUserEmail(): Observable<string> {
        const promise = this.supabase.auth.getUser();
        return from(promise).pipe(
            map(response => response.data.user?.email || '')
        );
    }
}