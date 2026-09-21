import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
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

export type VehicleEventType = 'view' | 'favorite' | 'unfavorite' | 'compare' | 'click' | 'contact';

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
            if (!resposta.data) return null;

            const favoritos = await this.auth.supabase
                .from('user_favorites')
                .select('vehicle_id')
                .eq('user_id', data.user.id);
            if (favoritos.error) throw favoritos.error;

            return {
                ...(resposta.data as UserProfileRecord),
                carros_favoritos: favoritos.data.map((item) => item.vehicle_id),
            };
        });

        return from(promise);
    }

    salvar(changes: UserProfileChanges): Observable<UserProfileRecord> {
        const promise = this.auth.supabase.auth.getUser().then(async ({ data, error }) => {
            if (error || !data.user) throw new Error('Sessão expirada. Faça login novamente.');

            const atual = await this.auth.supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();
            if (atual.error) throw atual.error;

            const registro = {
                id: data.user.id,
                ...changes,
                email: data.user.email ?? changes.email,
                updated_at: new Date().toISOString(),
            };

            if (atual.data && this.perfilMudou(atual.data as UserProfileRecord, changes)) {
                const historico = await this.auth.supabase.from('user_profile_history').insert({
                    user_id: data.user.id,
                    nome: changes.nome,
                    email: registro.email,
                    idade: changes.idade,
                    genero: changes.genero,
                    telefone: changes.telefone,
                    uso_principal: changes.uso_principal,
                    passageiros: changes.passageiros,
                    rodagem_mensal: changes.rodagem_mensal,
                    orcamento: changes.orcamento,
                    prioridades: changes.prioridades,
                    compartilha_com_concessionaria: changes.compartilha_com_concessionaria,
                });
                if (historico.error) throw historico.error;
            }

            const resposta = await this.auth.supabase
                .from('profiles')
                .upsert(registro, { onConflict: 'id' })
                .select()
                .single();

            if (resposta.error) throw resposta.error;

            const limparFavoritos = await this.auth.supabase
                .from('user_favorites')
                .delete()
                .eq('user_id', data.user.id);
            if (limparFavoritos.error) throw limparFavoritos.error;

            if (changes.carros_favoritos.length) {
                const favoritos = await this.auth.supabase
                    .from('user_favorites')
                    .insert(changes.carros_favoritos.map((vehicle_id) => ({ user_id: data.user.id, vehicle_id })));
                if (favoritos.error) throw favoritos.error;
            }

            return resposta.data as UserProfileRecord;
        });

        return from(promise);
    }

    registrarEvento(vehicleId: string, eventType: VehicleEventType, vehicleName?: string, metadata?: Record<string, unknown>): Observable<void> {
        const promise = this.auth.supabase.auth.getUser().then(async ({ data, error }) => {
            if (error || !data.user) return;
            const resposta = await this.auth.supabase.from('vehicle_events').insert({
                user_id: data.user.id,
                vehicle_id: vehicleId,
                vehicle_name: vehicleName ?? vehicleId,
                event_type: eventType,
                metadata: metadata ?? {},
            });
            if (resposta.error) throw resposta.error;
        });
        return from(promise);
    }

    salvarFavoritos(vehicleIds: string[]): Observable<void> {
        const promise = this.auth.supabase.auth.getUser().then(async ({ data, error }) => {
            if (error || !data.user) return;

            const limpar = await this.auth.supabase
                .from('user_favorites')
                .delete()
                .eq('user_id', data.user.id);
            if (limpar.error) throw limpar.error;

            if (!vehicleIds.length) return;
            const resposta = await this.auth.supabase
                .from('user_favorites')
                .insert(vehicleIds.map((vehicle_id) => ({ user_id: data.user.id, vehicle_id })));
            if (resposta.error) throw resposta.error;
        });
        return from(promise);
    }

    private perfilMudou(atual: UserProfileRecord, novo: UserProfileChanges): boolean {
        return ['nome', 'idade', 'genero', 'telefone', 'uso_principal', 'passageiros', 'rodagem_mensal', 'orcamento']
            .some((campo) => atual[campo as keyof UserProfileRecord] !== novo[campo as keyof UserProfileChanges])
            || JSON.stringify(atual.prioridades ?? []) !== JSON.stringify(novo.prioridades ?? [])
            || atual.compartilha_com_concessionaria !== novo.compartilha_com_concessionaria;
    }
}
