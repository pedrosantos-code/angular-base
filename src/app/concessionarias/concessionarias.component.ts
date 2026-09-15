import { AfterViewInit, Component, DestroyRef, EventEmitter, Input, OnDestroy, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { catchError, map, of } from 'rxjs';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';

export interface Coordenada { lat: number; lng: number; }

export interface JanelaHorario { abre: string; fecha: string; }

/** Janela de funcionamento por dia. `null` = fechado naquele dia. */
export interface Horario {
  segSex: JanelaHorario;
  sab: JanelaHorario | null;
  dom: JanelaHorario | null;
}

export interface Unidade {
  id: string;
  nome: string;
  endereco: string;
  bairro: string;
  coord: Coordenada;
  /** Etiquetas de serviço: 'Vendas', 'Test-drive', 'Oficina', 'Peças'… */
  servicos: string[];
  horario: Horario;
  proximaVaga: string | null;
  /** Só preenchido quando há origem. Veja distanciaEntre(). */
  distanciaKm?: number;
}

@Component({
  selector: 'seia-concessionarias',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent, RodapeComponent],
  templateUrl: './concessionarias.component.html',
  styleUrl: './concessionarias.component.css',
})
export class ConcessionariasComponent implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private http = inject(HttpClient);

  /** Atualiza a cada minuto para o status aberto/fechado virar sozinho quando o horário passa. */
  private readonly agora = signal(new Date());

  constructor() {
    const id = setInterval(() => this.agora.set(new Date()), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  private mapa?: L.Map;
  private marcadores = new Map<string, L.Marker>();
  private marcadorOrigem?: L.Marker;

  ngAfterViewInit(): void {
    this.mapa = L.map('mapa-concessionarias').setView([-23.58, -46.68], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.mapa);
    this.atualizarMarcadores(true);
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
  }

  private criarIcone(numero: number, ativo: boolean): L.DivIcon {
    return L.divIcon({
      className: 'cc-pin-wrap',
      html: `<span class="cc-pin${ativo ? ' cc-pin-on' : ''}">${numero}</span>`,
      iconSize: [26, 32],
      iconAnchor: [13, 32],
      popupAnchor: [0, -30],
    });
  }

  private popupHtml(u: Unidade): string {
    const aberta = this.estaAberta(u);
    const status = aberta ? `Aberto ${this.expedienteTexto(u)}` : `Fechado · ${this.expedienteTexto(u)}`;
    const tags = u.servicos.map((s) => `<span class="cc-popup-tag">${s}</span>`).join('');
    return `
      <div class="cc-popup">
        <strong>${u.nome}</strong>
        <p>${u.endereco} · ${u.bairro}</p>
        <div class="cc-popup-tags">${tags}</div>
        <p class="cc-popup-status ${aberta ? 'is-open' : 'is-closed'}">${status}</p>
      </div>
    `;
  }

  /** Recria os pinos a partir da lista filtrada/ordenada atual. `ajustarZoom` reenquadra o mapa nos pinos visíveis. */
  private atualizarMarcadores(ajustarZoom = false): void {
    if (!this.mapa) return;

    const lista = this.ordenadas;
    const atuais = new Set(lista.map((u) => u.id));
    for (const [id, marcador] of this.marcadores) {
      if (!atuais.has(id)) {
        marcador.remove();
        this.marcadores.delete(id);
      }
    }

    lista.forEach((u, i) => {
      const icone = this.criarIcone(i + 1, this.selecionada === u.id);
      const existente = this.marcadores.get(u.id);
      if (existente) {
        existente.setIcon(icone);
        return;
      }
      const marcador = L.marker([u.coord.lat, u.coord.lng], { icon: icone })
        .addTo(this.mapa!)
        .bindPopup(this.popupHtml(u));
      marcador.on('click', () => this.escolher(u));
      this.marcadores.set(u.id, marcador);
    });

    if (ajustarZoom && lista.length) {
      const marcadoresParaEnquadrar = [...this.marcadores.values()];
      if (this.marcadorOrigem) marcadoresParaEnquadrar.push(this.marcadorOrigem);
      const grupo = L.featureGroup(marcadoresParaEnquadrar);
      this.mapa.fitBounds(grupo.getBounds().pad(0.25), { maxZoom: 14 });
    }
  }

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

  @Input() unidades: Unidade[] = [
    {
      id: 'caoa-ceasa',
      nome: 'Ford CAOA - Ceasa',
      endereco: 'Av. Dr. Gastão Vidigal, 1250',
      bairro: 'Vila Leopoldina',
      coord: { lat: -23.5217, lng: -46.7307 },
      servicos: ['Vendas', 'Test-drive', 'Oficina'],
      horario: { segSex: { abre: '08:00', fecha: '19:00' }, sab: { abre: '08:00', fecha: '13:00' }, dom: null },
      proximaVaga: 'hoje às 15h30',
    },
    {
      id: 'caoa-ibirapuera',
      nome: 'Ford Caoa - Ibirapuera',
      endereco: 'Av. Ibirapuera, 2400',
      bairro: 'Moema',
      coord: { lat: -23.6103, lng: -46.6613 },
      servicos: ['Vendas', 'Test-drive', 'Peças'],
      horario: { segSex: { abre: '08:00', fecha: '18:00' }, sab: { abre: '08:00', fecha: '13:00' }, dom: null },
      proximaVaga: 'amanhã às 09h00',
    },
    {
      id: 'caoa-jabaquara',
      nome: 'Ford CAOA - Jabaquara',
      endereco: 'Av. Jabaquara, 2207',
      bairro: 'Jabaquara / São Judas',
      coord: { lat: -23.6272, lng: -46.6407 },
      servicos: ['Vendas', 'Oficina', 'Peças'],
      horario: { segSex: { abre: '08:00', fecha: '18:00' }, sab: { abre: '08:00', fecha: '13:00' }, dom: null },
      proximaVaga: null,
    },
    {
      id: 'sonnervig',
      nome: 'Ford Sonnervig',
      endereco: 'Rua dos Machados, 150',
      bairro: 'Vila Guilherme',
      coord: { lat: -23.5093, lng: -46.6058 },
      servicos: ['Vendas', 'Test-drive', 'Oficina', 'Peças'],
      horario: { segSex: { abre: '08:00', fecha: '18:00' }, sab: { abre: '08:00', fecha: '13:00' }, dom: null },
      proximaVaga: 'hoje às 17h00',
    },
    {
      id: 'ford-sao-paulo',
      nome: 'Ford For São Paulo',
      endereco: 'Av. das Nações Unidas, 21883',
      bairro: 'Zona Sul',
      coord: { lat: -23.652, lng: -46.71 },
      servicos: ['Vendas', 'Test-drive'],
      horario: { segSex: { abre: '09:00', fecha: '18:00' }, sab: null, dom: null },
      proximaVaga: null,
    },
  ];
  @Input() selecionada: string | null = null;

  /** Vazio = mostra todas as unidades. Preenchido = só as que oferecem ao menos um dos serviços marcados. */
  filtroServicos = new Set<string>();

  get servicosDisponiveis(): string[] {
    const vistos = new Set<string>();
    for (const u of this.unidades) {
      for (const s of u.servicos) vistos.add(s);
    }
    return [...vistos];
  }

  alternarServico(servico: string): void {
    this.filtroServicos.has(servico) ? this.filtroServicos.delete(servico) : this.filtroServicos.add(servico);
    this.atualizarMarcadores(true);
  }

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

  /** Lista filtrada por serviço e raio (quando há origem), com distância preenchida e ordenada da mais perto. */
  get ordenadas(): Unidade[] {
    const filtradasPorServico = this.filtroServicos.size
      ? this.unidades.filter((u) => u.servicos.some((s) => this.filtroServicos.has(s)))
      : this.unidades;

    const comDistancia = filtradasPorServico.map((u) => ({
      ...u,
      distanciaKm: this.origem ? ConcessionariasComponent.distanciaEntre(this.origem, u.coord) : undefined,
    }));

    if (!this.origem) return comDistancia;

    return comDistancia
      .filter((u) => (u.distanciaKm ?? Infinity) <= this.raioKm)
      .sort((a, b) => (a.distanciaKm ?? 0) - (b.distanciaKm ?? 0));
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

  private janelaDoDia(h: Horario, data: Date): JanelaHorario | null {
    const dia = data.getDay();
    if (dia === 0) return h.dom;
    if (dia === 6) return h.sab;
    return h.segSex;
  }

  private minutosDoDia(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  private formatarHora(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number);
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
  }

  /** Compara o horário de funcionamento com o relógio atual — vira sozinho quando o expediente passa. */
  estaAberta(u: Unidade): boolean {
    const agora = this.agora();
    const janela = this.janelaDoDia(u.horario, agora);
    if (!janela) return false;
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    return minutosAgora >= this.minutosDoDia(janela.abre) && minutosAgora < this.minutosDoDia(janela.fecha);
  }

  /** 'até 18h' quando aberta; 'abre hoje/amanhã/segunda às Xh' quando fechada. */
  expedienteTexto(u: Unidade): string {
    const agora = this.agora();
    const janelaHoje = this.janelaDoDia(u.horario, agora);

    if (this.estaAberta(u)) {
      return `até ${this.formatarHora(janelaHoje!.fecha)}`;
    }

    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    if (janelaHoje && minutosAgora < this.minutosDoDia(janelaHoje.abre)) {
      return `abre hoje às ${this.formatarHora(janelaHoje.abre)}`;
    }

    const nomesDias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    for (let i = 1; i <= 7; i++) {
      const data = new Date(agora);
      data.setDate(data.getDate() + i);
      const janela = this.janelaDoDia(u.horario, data);
      if (janela) {
        const rotulo = i === 1 ? 'amanhã' : nomesDias[data.getDay()];
        return `abre ${rotulo} às ${this.formatarHora(janela.abre)}`;
      }
    }
    return 'fechado';
  }

  /** Rota no Google Maps a partir da origem, quando houver. */
  rota(u: Unidade): string {
    const destino = encodeURIComponent(`${u.endereco}, ${u.bairro}`);
    const partida = this.origem ? `&origin=${this.origem.lat},${this.origem.lng}` : '';
    return `https://www.google.com/maps/dir/?api=1&destination=${destino}${partida}`;
  }

  buscando = false;
  erroBusca: string | null = null;

  /** Geocodifica CEP/cidade via Nominatim (OpenStreetMap) — mesmo provedor dos tiles do mapa, sem custo/chave. */
  private geocodificar(consulta: string) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(consulta)}`;
    return this.http.get<{ lat: string; lon: string }[]>(url).pipe(
      map((resultados) => (resultados.length ? { lat: +resultados[0].lat, lng: +resultados[0].lon } : null)),
      catchError(() => of(null)),
    );
  }

  aplicarBusca(): void {
    const consulta = this.local.trim();
    if (!consulta) return;

    this.buscar.emit({ local: this.local, raioKm: this.raioKm });
    this.buscando = true;
    this.erroBusca = null;

    this.geocodificar(consulta).subscribe((coord) => {
      this.buscando = false;
      if (!coord) {
        this.erroBusca = 'Não encontramos esse CEP ou cidade. Tente outro formato.';
        return;
      }
      this.definirOrigem(coord, 'Ponto de partida');
    });
  }

  aoMudarRaio(): void {
    this.atualizarMarcadores(true);
  }

  escolher(u: Unidade): void {
    this.selecionada = u.id;
    this.selecionar.emit(u.id);
    this.atualizarMarcadores();

    const marcador = this.marcadores.get(u.id);
    if (marcador && this.mapa) {
      this.mapa.panTo(marcador.getLatLng());
      marcador.openPopup();
    }
  }

  private definirOrigem(coord: Coordenada, rotuloPopup: string): void {
    this.origem = coord;

    if (this.mapa) {
      if (this.marcadorOrigem) {
        this.marcadorOrigem.setLatLng([coord.lat, coord.lng]);
      } else {
        this.marcadorOrigem = L.marker([coord.lat, coord.lng], {
          icon: L.divIcon({ className: 'cc-pin-wrap', html: '<span class="cc-pin cc-pin-origem"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
        })
          .addTo(this.mapa)
          .bindPopup(rotuloPopup);
      }
    }

    this.atualizarMarcadores(true);
  }

  usarMinhaLocalizacao(): void {
    this.usarLocalizacao.emit();
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (posicao) => this.definirOrigem({ lat: posicao.coords.latitude, lng: posicao.coords.longitude }, 'Você está aqui'),
      () => {
        this.erroBusca = 'Não conseguimos acessar sua localização. Tente informar o CEP.';
      },
    );
  }
}