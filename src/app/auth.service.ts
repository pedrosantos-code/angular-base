import { Injectable } from '@angular/core';
import { AuthResponse, createClient } from '@supabase/supabase-js'
import { environment } from '../environments/environment';
import { Observable, from } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    register(
        email: string,
        password: string
    ): Observable<AuthResponse> {
        const promise = this.supabase.auth.signUp({
            email,
            password,
        });
        return from(promise);
    }

    login(
        email: string,
        password: string
    ): Observable<AuthResponse> {
        const promise = this.supabase.auth.signInWithPassword({
            email,
            password,
        });
        return from(promise);
    }
}