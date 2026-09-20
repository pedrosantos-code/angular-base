import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { AuthService } from './auth.service';

export interface UserProfileRecord {
    id: string;
    nome: string;
    email: string;
    idade: number | null;
    genero: string;
    telefone: string;
    uso_principal: string;
    passageiros: string;
    rodagem_mensal: string;
    orcamento: string;
    prioridades: string[];
    carros_favoritos: string[];
    carros_comparados: string[];
    compartilha_com_concessionaria: boolean;
    created_at?: string;
    updated_at?: string;
}

export type UserProfileChanges = Omit<UserProfileRecord, 'id' | 'created_at' | 'updated_at'>;

@Injectable({ providedIn: 'root' })
export class ProfileService {
    private auth = inject(AuthService);

    carregar(): Observable<UserProfileRecord | null> {
        const promise = this.auth.supabase.auth.getUser().then(async ({ data, error }) => {
            if (error || !data.user) return null;

            const resposta = await this.auth.supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();

            if (resposta.error) throw resposta.error;
            return resposta.data as UserProfileRecord | null;
        });

        return from(promise);
    }

    salvar(changes: UserProfileChanges): Observable<UserProfileRecord> {
        const promise = this.auth.supabase.auth.getUser().then(async ({ data, error }) => {
            if (error || !data.user) throw new Error('Sessão expirada. Faça login novamente.');

            const registro = {
                id: data.user.id,
                ...changes,
                email: data.user.email ?? changes.email,
                updated_at: new Date().toISOString(),
            };
            const resposta = await this.auth.supabase
                .from('profiles')
                .upsert(registro, { onConflict: 'id' })
                .select()
                .single();

            if (resposta.error) throw resposta.error;
            return resposta.data as UserProfileRecord;
        });

        return from(promise);
    }
}
