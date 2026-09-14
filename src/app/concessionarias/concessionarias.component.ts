import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';

export interface Coordenada { lat: number; lng: number; }

export interface Unidade {
  id: string;
  nome: string;
  endereco: string;
  bairro: string;
  coord: Coordenada;
  /** Etiquetas de serviço: 'Vendas', 'Test-drive', 'Oficina', 'Peças'… */
  servicos: string[];
  aberta: boolean;
  /** 'até 18h' quando aberta, 'abre sáb 08h' quando fechada. */
  expediente: string;
  proximaVaga: string | null;
  /** Só preenchido quando há origem. Veja distanciaEntre(). */
  distanciaKm?: number;
}

@Component({
  selector: 'seia-concessionarias',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './concessionarias.component.html',
  styleUrl: './concessionarias.component.css',
})
export class ConcessionariasComponent {
  private router = inject(Router);

  ir(chave: string): void {
    this.navegar.emit(chave);
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  sair(): void {
    this.router.navigateByUrl('/');
  }

  @Output() buscar = new EventEmitter<{ local: string; raioKm: number }>();
  @Output() usarLocalizacao = new EventEmitter<void>();
  @Output() selecionar = new EventEmitter<string>();
  @Output() agendar = new EventEmitter<string>();
  @Output() navegar = new EventEmitter<string>();

  @Input() local = 'São Paulo, SP';
  @Input() raioKm = 20;
  readonly raios = [5, 10, 20, 50];

  /** Ponto de origem. Sem ele não há distância — é a causa do "0 km" em todas as unidades. */
  @Input() origem: Coordenada | null = null;

  @Input() unidades: Unidade[] = [];
  @Input() selecionada: string | null = null;

  /**
   * Distância em linha reta, em km. Use como fallback quando não houver
   * rota calculada pelo serviço de mapas.
   */
  static distanciaEntre(a: Coordenada, b: Coordenada): number {
    const R = 6371;
    const rad = (g: number) => (g * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /** Lista com distância preenchida e ordenada da mais perto para a mais longe. */
  get ordenadas(): Unidade[] {
    const com = this.unidades.map((u) => ({
      ...u,
      distanciaKm: this.origem ? ConcessionariasComponent.distanciaEntre(this.origem, u.coord) : undefined,
    }));
    return this.origem
      ? com.sort((a, b) => (a.distanciaKm ?? 0) - (b.distanciaKm ?? 0))
      : com;
  }

  get resumo(): string {
    const n = this.ordenadas.length;
    const plural = n === 1 ? 'unidade' : 'unidades';
    return this.origem
      ? `${n} ${plural} em ${this.raioKm} km · mais perto primeiro`
      : `${n} ${plural} · informe um CEP para ordenar por distância`;
  }

  formatarKm(km?: number): string {
    return km === undefined ? '—' : `${km.toFixed(1).replace('.', ',')} km`;
  }

  /** Rota no Google Maps a partir da origem, quando houver. */
  rota(u: Unidade): string {
    const destino = encodeURIComponent(`${u.endereco}, ${u.bairro}`);
    const partida = this.origem ? `&origin=${this.origem.lat},${this.origem.lng}` : '';
    return `https://www.google.com/maps/dir/?api=1&destination=${destino}${partida}`;
  }

  aplicarBusca(): void {
    this.buscar.emit({ local: this.local, raioKm: this.raioKm });
  }

  escolher(u: Unidade): void {
    this.selecionada = u.id;
    this.selecionar.emit(u.id);
  }
}