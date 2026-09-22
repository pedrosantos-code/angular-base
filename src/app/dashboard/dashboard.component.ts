import { Component, computed, signal, inject, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, map } from 'rxjs';
import { Car, CarRecommendation, FordApiService } from '../ford-api.service';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { LinhasDeLuzComponent } from '../shared/linhas-de-luz.component';
import { AuthService } from '../auth.service';
import { fotoDoModelo } from '../shared/fotos-modelos';
import { Comparacao, ItemComparacao, SEGMENTOS, chaveRival, modeloDaBusca, montarComparacao } from '../shared/comparacao-linha';

/** Uma linha do gráfico e da tabela: um carro com a ficha já preenchida. */
export interface LinhaCarro {
  chave: string;
  nome: string;
  /** Motor, câmbio e ano da versão ("5.0L · 10AT · 2024"). */
  detalhe: string;
  potencia: number | null;
  velocidade: number | null;
  cambio: string;
  /** true só no modelo Ford pesquisado (a referência da comparação). */
  referencia: boolean;
}

export type AbaGrafico = 'ambos' | 'potencia' | 'velocidade';

/** Na busca por "Mustang" o carro mais parecido para a foto é o Mustang GT. */
const FOTO_DO_MODELO: Record<string, string> = { Mustang: 'Mustang GT' };

/**
 * Termo mandado pra API quando o nome de exibição não existe como texto no campo `model` dela: a API só tem
 * "Ford Maverick" (a versão Hybrid vira "FHEV" no `variant`), então buscar "Maverick Hybrid" não acha nada.
 */
const TERMO_BUSCA_API: Record<string, string> = { 'Maverick Hybrid': 'Maverick' };

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, TopbarComponent, RodapeComponent, LinhasDeLuzComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  host: { class: 'seia-pagina' },
})
export class DashboardComponent implements AfterViewInit {
  protected readonly title = signal('meu-projeto');

  private fordApi = inject(FordApiService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  onNavegar(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  irPerfil(): void {
    this.router.navigateByUrl('/perfil');
  }

  sair(): void {
    void this.authService.logout();
  }

  // Busca de veículo na API da Ford
  readonly sugestoes = ['Mustang', 'Ranger', 'Ranger Raptor', 'Territory', 'Bronco Sport', 'Maverick Hybrid', 'Explorer', 'F-150'];
  /** Só os que têm concorrentes cadastrados (fica pronto pra quando algum modelo ficar sem, sem quebrar o texto). */
  readonly sugestoesComComparacao = this.sugestoes.filter((s) => !!SEGMENTOS[s]);
  nomeCarro = signal<string>('');
  /** O que foi buscado de fato (o campo muda a cada tecla; o título dos resultados não). */
  termoBuscado = signal<string>('');
  carregando = signal<boolean>(false);
  erroBusca = signal<string | null>(null);
  totalEncontrado = signal<number>(0);
  resultados = signal<Car[]>([]);

  // Carros semelhantes ao primeiro resultado da busca
  buscandoSemelhantes = signal<boolean>(false);
  carrosSemelhantes = signal<CarRecommendation[]>([]);

  // Comparação com concorrentes do mesmo segmento (a API tem Honda e Hyundai além da Ford)
  comparacao = signal<Comparacao | null>(null);
  /** O modelo Ford pesquisado, com a ficha preenchida: é a referência da comparação. */
  referencia = signal<ItemComparacao | null>(null);
  /** Concorrentes do segmento (sem a Ford), com a ficha preenchida como nas versões Ford. */
  rivais = signal<ItemComparacao[]>([]);
  carregandoLinha = signal<boolean>(false);
  erroLinha = signal<string | null>(null);

  /** Modelo Ford da busca atual, quando é um dos que têm segmento cadastrado (é a referência da comparação). */
  modeloDestacado = signal<string | null>(null);
  private comparacoesGuardadas = new Map<string, Comparacao>();

  /** Aba do gráfico: as duas barras, só a potência ou só a velocidade. */
  aba = signal<AbaGrafico>('ambos');
  readonly abas: { chave: AbaGrafico; rotulo: string }[] = [
    { chave: 'ambos', rotulo: 'Ambos' },
    { chave: 'potencia', rotulo: 'Potência' },
    { chave: 'velocidade', rotulo: 'Velocidade' },
  ];

  /**
   * true quando o modelo pesquisado é um dos que têm concorrentes cadastrados: aí a tela compara o modelo Ford com os
   * concorrentes do mesmo segmento. Fora disso não há com quem comparar e aparecem as versões Ford encontradas.
   */
  get soConcorrentes(): boolean {
    const modelo = this.modeloDestacado();
    return !!modelo && !!SEGMENTOS[modelo];
  }

  /** Há referência e concorrentes prontos para mostrar cards, gráfico e tabela de comparação. */
  readonly modoComparacao = computed(() => this.soConcorrentes && !!this.referencia() && this.rivais().length > 0);

  /** Nome curto do modelo de referência, sem a marca ("Mustang GT"). */
  readonly nomeReferencia = computed(() => {
    const ref = this.referencia();
    const destacado = this.modeloDestacado();
    if (!ref) return destacado ?? '';
    // A API nunca escreve "Hybrid" no campo model do Maverick (só "FHEV" no variant) — usa o nome já resolvido.
    if (destacado === 'Maverick Hybrid') return destacado;
    // A API às vezes traz o mercado no nome ("Territory (China)"): fica só o modelo.
    const modelo = (ref.carro.model ?? ref.modelo).replace(/^ford\s+/i, '').replace(/\s*\([^)]*\)/g, '').trim();
    return modelo || ref.modelo;
  });

  /** Linhas do gráfico e da tabela: a referência seguida dos concorrentes, ou as versões Ford quando não há comparação. */
  readonly linhas = computed<LinhaCarro[]>(() => {
    if (this.modoComparacao()) {
      const ref = this.referencia() as ItemComparacao;
      return [
        this.linhaDe(ref.carro, 'ref', this.nomeReferencia(), true, ref.ano),
        ...this.rivais().map((r) => this.linhaDe(r.carro, `${r.marca}:${r.modelo}`, `${r.marca} ${r.modelo}`, false, r.ano)),
      ];
    }
    if (this.soConcorrentes) return [];
    return this.resultados().map((c) => this.linhaDe(c, String(c.id), this.nomeDoCarro(c), false, c.yearFrom ?? null));
  });

  /** Linhas da tabela: só os concorrentes na comparação (o modelo Ford já está nos cards); as versões no resto. */
  readonly linhasTabela = computed(() => this.linhas().filter((l) => !l.referencia));

  /** Maior valor da aba atual: as barras são proporcionais a ele (com as duas abas juntas, à mesma escala). */
  private readonly maximo = computed(() => {
    const aba = this.aba();
    const valores = this.linhas().flatMap((l) => [
      ...(aba !== 'velocidade' ? [l.potencia ?? 0] : []),
      ...(aba !== 'potencia' ? [l.velocidade ?? 0] : []),
    ]);
    return Math.max(1, ...valores);
  });

  /** Média de potência dos concorrentes e quanto o modelo Ford está acima (ou abaixo) dela. */
  readonly diferencaParaMedia = computed(() => {
    const ref = this.linhas().find((l) => l.referencia)?.potencia;
    const rivais = this.linhasTabela().map((l) => l.potencia).filter((p): p is number => p != null);
    if (ref == null || rivais.length === 0) return null;
    const media = rivais.reduce((a, b) => a + b, 0) / rivais.length;
    const diferenca = Math.round(ref - media);
    return { media: Math.round(media), diferenca, texto: `${diferenca > 0 ? '+' : diferenca < 0 ? '−' : ''}${Math.abs(diferenca)}` };
  });

  /** O concorrente mais potente. */
  readonly rivalMaisForte = computed(() => {
    const comPotencia = this.linhasTabela().filter((l) => l.potencia != null);
    if (comPotencia.length === 0) return null;
    return comPotencia.reduce((a, b) => ((b.potencia ?? 0) > (a.potencia ?? 0) ? b : a));
  });

  readonly fotoReferencia = computed(() => {
    const modelo = this.modeloDestacado();
    return fotoDoModelo(this.nomeReferencia()) ?? (modelo ? fotoDoModelo(FOTO_DO_MODELO[modelo] ?? modelo) : null);
  });

  readonly tituloGrafico = computed(() =>
    this.modoComparacao()
      ? `${this.nomeReferencia()} vs. ${this.plural(this.comparacao()?.segmento ?? '')}`
      : `Resultados para "${this.termoBuscado()}"`,
  );

  ngAfterViewInit(): void {
    const modelo = this.route.snapshot.queryParamMap.get('modelo');
    if (modelo) {
      this.nomeCarro.set(modelo);
      this.buscarGraficos();
      // Tira da URL depois de usado — sem isso, um F5 dispararia a busca de novo sozinho.
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  buscarSugestao(nome: string): void {
    this.nomeCarro.set(nome);
    this.buscarGraficos();
  }

  buscarGraficos(): void {
    const termo = this.nomeCarro().trim();
    if (!termo) {
      this.erroBusca.set('Digite o nome de um carro para buscar.');
      return;
    }

    this.carregando.set(true);
    this.erroBusca.set(null);
    this.carrosSemelhantes.set([]);

    const termoApi = TERMO_BUSCA_API[termo] ?? termo;
    this.fordApi.listCars({ make: 'FORD', model: termoApi, limit: 8 }).subscribe({
      next: (resposta) => {
        const itens = resposta.items.map((c) => this.preencherFicha(c));
        this.resultados.set(itens);
        this.totalEncontrado.set(resposta.total);
        this.termoBuscado.set(termo);
        this.carregando.set(false);

        if (itens.length === 0) {
          this.erroBusca.set('Nenhum veículo encontrado com esse nome.');
          return;
        }

        // Define o modelo Ford e zera os concorrentes ANTES de mostrar, para não aparecer a comparação da busca anterior.
        const modeloFord = modeloDaBusca(termo, this.sugestoes);
        this.modeloDestacado.set(modeloFord);
        this.referencia.set(null);
        this.rivais.set([]);
        this.buscarCarrosSemelhantes(itens[0].id);
        this.carregarComparacao(modeloFord);
      },
      error: () => {
        this.carregando.set(false);
        this.erroBusca.set('Não foi possível se conectar à API da Ford. Tente novamente.');
      },
    });
  }

  /** Busca os concorrentes do segmento do modelo Ford pesquisado (guarda o resultado para não repetir). */
  private carregarComparacao(modeloFord: string | null): void {
    this.modeloDestacado.set(modeloFord);
    this.erroLinha.set(null);

    if (!modeloFord || !SEGMENTOS[modeloFord]) {
      this.aplicarComparacao(null);
      return;
    }

    const guardada = this.comparacoesGuardadas.get(modeloFord);
    if (guardada) {
      this.aplicarComparacao(guardada);
      return;
    }

    this.carregandoLinha.set(true);
    this.aplicarComparacao(null);

    const rivais = SEGMENTOS[modeloFord].rivais;
    const pedidos = {
      ford: this.fordApi.listCars({ make: 'FORD', model: TERMO_BUSCA_API[modeloFord] ?? modeloFord, limit: 100 }).pipe(map((r) => r.items)),
      rivais: forkJoin(
        rivais.map((rival) => this.fordApi.listCars({ make: rival.marca, model: rival.busca, limit: 100 }).pipe(map((r) => r.items))),
      ),
    };
    forkJoin(pedidos).subscribe({
      next: ({ ford, rivais: porRival }) => {
        const carrosRivais = Object.fromEntries(rivais.map((rival, i) => [chaveRival(rival), porRival[i]]));
        const comparacao = montarComparacao(modeloFord, ford, carrosRivais);
        this.carregandoLinha.set(false);
        // Se a pessoa já buscou outro modelo enquanto isso, descarta este resultado.
        if (this.modeloDestacado() !== modeloFord) return;
        if (comparacao) this.comparacoesGuardadas.set(modeloFord, comparacao);
        this.aplicarComparacao(comparacao);
      },
      error: () => {
        this.carregandoLinha.set(false);
        this.erroLinha.set('Não foi possível carregar os concorrentes. Tente novamente.');
      },
    });
  }

  /** Guarda a comparação e separa o modelo Ford (referência) dos concorrentes, todos com a ficha preenchida. */
  private aplicarComparacao(comparacao: Comparacao | null): void {
    const itens = (comparacao?.itens ?? []).map((i) => ({ ...i, carro: this.preencherFicha(i.carro) }));
    this.comparacao.set(comparacao);
    this.referencia.set(itens.find((i) => i.referencia) ?? null);
    this.rivais.set(itens.filter((i) => !i.referencia));
  }

  private buscarCarrosSemelhantes(carId: number): void {
    this.buscandoSemelhantes.set(true);

    this.fordApi.getRecomendacoes(carId, 5).subscribe({
      next: (recomendacoes) => {
        this.buscandoSemelhantes.set(false);
        this.carrosSemelhantes.set(recomendacoes.filter((r) => r.id !== carId));
      },
      error: () => {
        this.buscandoSemelhantes.set(false);
        this.carrosSemelhantes.set([]);
      },
    });
  }

  /**
   * Preenche potência/velocidade quando a Ford não publica o dado da variante — só para a demonstração
   * não ficar com "—" na tela. Tenta ler o cavalo do próprio nome da variante antes de estimar.
   */
  private preencherFicha(carro: Car): Car {
    const potencia = carro.enginePowerBhp ?? this.estimarPotencia(carro);
    const velocidade = carro.topSpeedKph ?? this.estimarVelocidade(potencia);
    return { ...carro, enginePowerBhp: potencia, topSpeedKph: velocidade };
  }

  private estimarPotencia(carro: Car): number {
    const texto = `${carro.model ?? ''} ${carro.variant ?? ''}`;

    // Às vezes a Ford escreve o cavalo no nome da variante mesmo sem preencher o campo estruturado.
    const doTexto = texto.match(/\((\d+(?:\.\d+)?)\s*HP\)/i);
    if (doTexto) return Math.round(parseFloat(doTexto[1]));

    const t = texto.toLowerCase();
    if (t.includes('dark horse')) return 500;
    if (t.includes(' gt') || t.includes('gt ')) return 480;
    if (t.includes('raptor')) return 405;
    if (t.includes('lightning')) return 580;
    if (t.includes('v8')) return 400;
    if (t.includes('v6')) return 280;
    return 200;
  }

  private estimarVelocidade(potenciaBhp: number): number {
    return Math.round(Math.min(260, 110 + potenciaBhp * 0.42));
  }

  private linhaDe(carro: Car, chave: string, nome: string, referencia: boolean, ano: number | null): LinhaCarro {
    return {
      chave,
      nome,
      detalhe: [this.detalheDaVersao(carro), ano].filter(Boolean).join(' · '),
      potencia: carro.enginePowerBhp ?? null,
      velocidade: carro.topSpeedKph ?? null,
      cambio: carro.gearboxType ?? (carro.engineFuelType === 'ELECTRIC' ? 'Elétrico' : '—'),
      referencia,
    };
  }

  /** Largura da barra em % da trilha: o maior valor ocupa 86%, o resto fica proporcional (sobra espaço para o número). */
  largura(valor: number | null): number {
    return valor ? Math.max(2, (valor / this.maximo()) * 86) : 0;
  }

  /** "+150 cv" / "−150 cv": quanto o concorrente tem a mais ou a menos que o modelo Ford pesquisado. */
  diferencaDoRival(linha: LinhaCarro): { texto: string; ford: boolean } | null {
    const ref = this.linhas().find((l) => l.referencia)?.potencia;
    if (ref == null || linha.potencia == null) return null;
    const d = linha.potencia - ref;
    return { texto: `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)} cv`, ford: d < 0 };
  }

  /** "Esportivo" → "esportivos", "Picape compacta" → "picapes compactas", "SUV médio" → "SUV médios". */
  private plural(segmento: string): string {
    return segmento
      .split(' ')
      .map((palavra, i) => (palavra === 'SUV' ? palavra : (i === 0 ? palavra.toLowerCase() : palavra) + 's'))
      .join(' ');
  }

  /** "Ford Mustang GT": o nome do carro, com a marca na frente quando a API não a traz no modelo. */
  nomeDoCarro(carro: Car): string {
    const modelo = (carro.model ?? `#${carro.id}`).trim();
    return /^ford\b/i.test(modelo) ? modelo : `Ford ${modelo}`;
  }

  /** Detalhe curto para diferenciar versões do mesmo carro: motor e câmbio ("5.0L · 10AT"). */
  private detalheDaVersao(carro: Car): string {
    const texto = carro.variant ?? '';
    const motor = texto.match(/\b(\d\.\d)L\b/)?.[0];
    const cambio = texto.match(/\b(\d{1,2}(?:AT|MT)|CVT|DCT)\b/)?.[0] ?? carro.gearboxType?.toLowerCase();
    return [motor, cambio].filter(Boolean).join(' · ');
  }
}
