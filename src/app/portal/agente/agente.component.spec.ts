import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FONTE_VEICULOS, fonteVazia } from '../../shared/fonte-veiculos';
import { FONTE_AFINIDADE, FonteAfinidade } from '../../shared/fonte-afinidade';
import {
  ApiPessoasError, ModeloDetalhe, MunicipioApi, PerfilApi, RankingCosseno, RankingRegressao,
} from '../../shared/api-pessoas.service';
import { AnaliseIaError, AnaliseIaService, Insights } from '../../shared/analise-ia.service';
import { AgenteComponent } from './agente.component';

/** Dublê do serviço de IA — nenhum teste aqui toca a rede nem gasta crédito de API. */
class IaFalsa {
  configurada = true;
  proximoInsight: Insights | null = null;
  proximaFalha: string | null = null;
  ultimoPayload: unknown = null;

  async gerarInsights(analise: unknown): Promise<Insights> {
    this.ultimoPayload = analise;
    if (this.proximaFalha) throw new AnaliseIaError(this.proximaFalha);
    return this.proximoInsight!;
  }

  async perguntar(analise: unknown, pergunta: string): Promise<string> {
    this.ultimoPayload = analise;
    if (this.proximaFalha) throw new AnaliseIaError(this.proximaFalha);
    return `resposta para: ${pergunta}`;
  }
}

const PERFIL_API: PerfilApi = {
  genero: 'masculino',
  idade: 24,
  grupo: 'masculino 20-29',
  localidade: { tipo: 'municipio', nome: 'Campinas' },
  ajustes_de_contexto: [
    { controle: 'escolaridade|esc:superior', motivo: 'escolaridade=superior', valor_pct: 24.9 },
  ],
  extraido_nlp: null,
};

const AVISO = 'Escores de afinidade estimados por regressão ecológica no nível do município.';

const REGRESSAO: RankingRegressao = {
  metodo: 'regressao',
  perfil: PERFIL_API,
  aviso: AVISO,
  ranking: [
    { modelo: 'Gol', share_perfil_pct: 6.289, share_municipio_pct: 9.03, lift: 0.696 },
    { modelo: 'Palio', share_perfil_pct: 4.883, share_municipio_pct: 4.474, lift: 1.091 },
    { modelo: 'Fiesta', share_perfil_pct: 4.149, share_municipio_pct: 3.963, lift: 1.047 },
  ],
};

const COSSENO: RankingCosseno = {
  metodo: 'cosseno',
  peso_demografico: 0.25,
  perfil: PERFIL_API,
  aviso: 'Semelhança de cossenos entre o perfil da pessoa e o perfil típico de cada modelo.',
  ranking: [
    {
      modelo: 'Gol',
      cosseno: 0.61,
      cos_demografia: 0.05,
      cos_contexto: 0.7,
      share_estado_pct: 10.2,
      principais_fatores: [
        { caracteristica: '% da população com renda per capita > 5 SM', sentido: 'baixo', contribuicao: 0.657 },
      ],
    },
  ],
};

const DETALHE: ModeloDetalhe = {
  modelo: 'Gol',
  frota_pf_por_adulto_media: 0.09,
  efeitos_contexto: [
    {
      controle: 'renda|renda>5SM',
      descricao: '% da população com renda per capita > 5 SM',
      efeito_pct_por_dp: -22.7,
      ic90_pct: [-30.5, -15.8],
      distinguivel_de_zero: true,
    },
    {
      controle: 'situacao|rural',
      descricao: '% de população rural',
      efeito_pct_por_dp: -1.4,
      ic90_pct: [-3.4, 0.5],
      distinguivel_de_zero: false,
    },
  ],
  grupos: [
    { grupo: 'H 20-29', lift: 1.029, mix_pct: 3.22, lift_ic90: [0.971, 1.108] },
    { grupo: 'M 20-29', lift: 0.865, mix_pct: 2.71, lift_ic90: [0.823, 0.901] },
  ],
};

/** Fonte de afinidade controlável, com os mesmos formatos que a API devolve. */
class FonteFalsa implements FonteAfinidade {
  nome = 'API Pessoas (dublê de teste)';
  falhaRanking: string | null = null;
  falhaCosseno = false;
  ultimaConsulta: unknown = null;
  sugestoes: MunicipioApi[] = [];

  async ranking(consulta: unknown): Promise<RankingRegressao> {
    this.ultimaConsulta = consulta;
    if (this.falhaRanking) throw new ApiPessoasError(this.falhaRanking);
    return REGRESSAO;
  }

  async rankingCaracteristico(): Promise<RankingCosseno> {
    if (this.falhaCosseno) throw new ApiPessoasError('cosseno fora do ar');
    return COSSENO;
  }

  async detalheModelo(): Promise<ModeloDetalhe> {
    return DETALHE;
  }

  async municipios(): Promise<MunicipioApi[]> {
    return this.sugestoes;
  }
}

/**
 * Texto que o analista realmente vê, sem a área de impressão.
 *
 * `.ag-impressao` fica no DOM mas só aparece em @media print, e ela carrega o
 * anexo técnico de propósito — o PDF circula sem quem o gerou. Medir jargão de
 * tela sem descontar esse bloco dava falso positivo.
 */
function textoDaTela(el: HTMLElement): string {
  const copia = el.cloneNode(true) as HTMLElement;
  copia.querySelector('.ag-impressao')?.remove();
  return copia.textContent ?? '';
}

describe('AgenteComponent · sobre a API Pessoas', () => {
  function criar() {
    const ia = new IaFalsa();
    const fonte = new FonteFalsa();
    TestBed.configureTestingModule({
      imports: [AgenteComponent],
      providers: [
        provideRouter([]),
        { provide: FONTE_AFINIDADE, useValue: fonte },
        { provide: FONTE_VEICULOS, useValue: fonteVazia('stub de teste') },
        { provide: AnaliseIaService, useValue: ia },
      ],
    });
    const fixture = TestBed.createComponent(AgenteComponent);
    fixture.detectChanges();
    return { fixture, ia, fonte, comp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  /** Descreve o cliente e roda a consulta, que é o que destrava o resto do painel. */
  async function analisar(c: ReturnType<typeof criar>) {
    c.comp.descricao = 'Homem de 24 anos, solteiro, ensino superior, mora em Campinas.';
    c.comp.lerDescricao();
    await c.comp.analisar();
    c.fixture.detectChanges();
  }

  it('não consulta a API enquanto faltam idade ou gênero', async () => {
    const c = criar();
    c.comp.descricao = 'Cliente da capital, ensino superior.';
    c.comp.lerDescricao();

    await c.comp.analisar();

    expect(c.comp.faltas().length).toBeGreaterThan(0);
    expect(c.fonte.ultimaConsulta).toBeNull(); // nenhuma chamada foi feita
    expect(c.comp.analisou()).toBe(false);
  });

  it('traduz a frase nos parâmetros que a API aceita', async () => {
    const c = criar();
    await analisar(c);

    const consulta = c.fonte.ultimaConsulta as Record<string, unknown>;
    expect(consulta['genero']).toBe('masculino');
    expect(consulta['idade']).toBe(24);
    expect(consulta['municipio']).toBe('Campinas');
    expect(consulta['escolaridade']).toBe('superior');
  });

  it('monta o ranking com os números que a API devolveu', async () => {
    const c = criar();
    await analisar(c);

    expect(c.comp.matches().length).toBe(3);
    expect(c.comp.lider()!.modelo).toBe('Gol');
    expect(c.comp.lider()!.sharePerfilPct).toBe(6.289);
  });

  it('separa o líder de share do modelo mais característico do perfil', async () => {
    const c = criar();
    await analisar(c);

    // O Gol lidera o share e tem lift abaixo de 1; o Palio é quem desvia da praça.
    expect(c.comp.lider()!.modelo).toBe('Gol');
    expect(c.comp.maisCaracteristico()!.modelo).toBe('Palio');
  });

  it('mostra erro legível quando a API não responde', async () => {
    const c = criar();
    c.fonte.falhaRanking = 'A API Pessoas não respondeu em 25s.';
    await analisar(c);

    expect(c.comp.erro()).toContain('não respondeu');
    expect(c.comp.matches().length).toBe(0);
  });

  it('mantém o ranking quando só o método de semelhança falha', async () => {
    const c = criar();
    c.fonte.falhaCosseno = true;
    await analisar(c);

    // Perder os fatores explicativos não pode derrubar a análise inteira.
    expect(c.comp.matches().length).toBe(3);
    expect(c.comp.avisoParcial()).toContain('cosseno');
    expect(c.comp.lider()!.fatores).toEqual([]);
  });

  it('separa o que explica do que não tem evidência', async () => {
    const c = criar();
    await analisar(c);

    // Dos dois efeitos do dublê, só o rural tem intervalo cruzando o zero. Ele vira
    // "sem evidência" e a tela marca como não utilizável — é o que impede alguém de
    // levar para a reunião um argumento que a base não sustenta.
    expect(c.comp.detalheLider()!.efeitos_contexto.length).toBe(2);
    expect(c.comp.explicacoes().length).toBe(1);
    expect(c.comp.semEvidencia().length).toBe(1);
    expect(c.comp.semEvidencia()[0].texto).toContain('população rural');

    expect(textoDaTela(c.el)).toContain('Não use como argumento');
  });

  it('mostra a ressalva em linguagem simples e guarda a técnica no detalhe', async () => {
    const c = criar();
    await analisar(c);

    // Na superfície, a ressalva que o gestor precisa ler.
    expect(textoDaTela(c.el)).toContain('não para prever o que um cliente específico');
    // O texto metodológico da base fica recolhido, não some.
    expect(textoDaTela(c.el)).not.toContain('regressão ecológica');

    c.comp.mostrarTecnico.set(true);
    c.fixture.detectChanges();
    expect(textoDaTela(c.el)).toContain('regressão ecológica');
  });

  it('não deixa jargão nenhum aparecer na tela sem abrir o detalhe técnico', async () => {
    // É o pedido explícito da aba: visão executiva. Se alguém reintroduzir "lift"
    // ou um código de controle na superfície, este teste cai.
    const c = criar();
    await analisar(c);

    const superficie = textoDaTela(c.el);
    for (const jargao of ['lift', 'cosseno', 'desvio padrão', 'IC 90', 'esc:superior', 'share']) {
      expect(superficie.toLowerCase()).not.toContain(jargao.toLowerCase());
    }
  });

  it('entrega os números crus quando o detalhe técnico é aberto', async () => {
    const c = criar();
    await analisar(c);

    c.comp.mostrarTecnico.set(true);
    c.fixture.detectChanges();

    const texto = textoDaTela(c.el);
    expect(texto).toContain('Lift');
    expect(texto).toContain('Cosseno');
    expect(texto).toContain('escolaridade|esc:superior');
  });

  it('manda para a IA os números da API e o aviso, nunca preço', async () => {
    const c = criar();
    await analisar(c);
    c.ia.proximoInsight = {
      veredito: 'ok', concordaComRanking: true, leituraPerfil: 'ok',
      riscos: [], argumentosVenda: [], perguntasDoGestor: [],
    };

    await c.comp.gerarInsights();

    const payload = c.ia.ultimoPayload as Record<string, unknown>;
    expect(payload['rankingPorParticipacao']).toBeDefined();
    expect(payload['perfilComoApiLeu']).toBeDefined();
    expect(String(payload['avisoMetodologico'])).toContain('regressão ecológica');
    // A base não publica preço; um campo desses seria número inventado.
    expect(JSON.stringify(payload).toLowerCase()).not.toContain('orcamento');
  });

  it('usa o autocomplete de município e fixa a escolha', async () => {
    const c = criar();
    c.fonte.sugestoes = [{ cod_ibge: 3509502, municipio: 'Campinas' }];
    c.comp.buscaMunicipio = 'camp';

    await c.comp.buscarMunicipios();
    expect(c.comp.sugestoesMunicipio().length).toBe(1);

    c.comp.escolherMunicipio(c.comp.sugestoesMunicipio()[0]);
    expect(c.comp.rascunho().municipio).toBe('Campinas');
    expect(c.comp.sugestoesMunicipio().length).toBe(0);
  });

  it('não busca município com menos de três letras', async () => {
    const c = criar();
    c.fonte.sugestoes = [{ cod_ibge: 1, municipio: 'Qualquer' }];
    c.comp.buscaMunicipio = 'ca';

    await c.comp.buscarMunicipios();

    expect(c.comp.sugestoesMunicipio().length).toBe(0);
  });

  it('monta a área de impressão com o ranking completo', async () => {
    const c = criar();
    await analisar(c);

    const impressao = c.el.querySelector('.ag-impressao');
    expect(impressao).not.toBeNull();
    expect(impressao!.textContent).toContain('Resumo executivo');
    expect(impressao!.querySelectorAll('.pdf-tabela tbody tr').length).toBeGreaterThanOrEqual(
      c.comp.matches().length,
    );
  });

  it('registra a data no momento em que o PDF é pedido', async () => {
    const c = criar();
    await analisar(c);
    expect(c.comp.geradoEm()).toBe('');

    const original = window.print;
    (window as { print: unknown }).print = () => {};
    try {
      c.comp.baixarPdf();
    } finally {
      (window as { print: unknown }).print = original;
    }

    expect(c.comp.geradoEm()).not.toBe('');
    expect(c.comp.imagensGraficos()).not.toBeNull();
  });

  it('gera o PDF mesmo quando um gráfico não pode ser capturado', async () => {
    // No jsdom o canvas não tem contexto 2D, então nenhum gráfico captura —
    // exatamente o cenário que antes derrubava o resumo inteiro por exceção.
    const c = criar();
    await analisar(c);

    const original = window.print;
    (window as { print: unknown }).print = () => {};
    try {
      expect(() => c.comp.baixarPdf()).not.toThrow();
    } finally {
      (window as { print: unknown }).print = original;
    }

    const img = c.comp.imagensGraficos();
    expect(img).not.toBeNull();
    expect(img!.share).toBe(''); // sem imagem, mas sem quebrar
  });

  it('descarta a leitura da IA ao analisar outro perfil', async () => {
    const c = criar();
    await analisar(c);
    c.ia.proximoInsight = {
      veredito: 'ok', concordaComRanking: true, leituraPerfil: 'ok',
      riscos: [], argumentosVenda: [], perguntasDoGestor: [],
    };
    await c.comp.gerarInsights();
    expect(c.comp.insights()).not.toBeNull();

    c.comp.descricao = 'Mulher de 38 anos, casada, mora em São Paulo.';
    c.comp.lerDescricao();
    await c.comp.analisar();

    expect(c.comp.insights()).toBeNull();
    expect(c.comp.conversa().length).toBe(0);
  });

  it('limpa tudo e volta ao estado inicial', async () => {
    const c = criar();
    await analisar(c);
    expect(c.comp.analisou()).toBe(true);

    c.comp.limpar();

    expect(c.comp.analisou()).toBe(false);
    expect(c.comp.rascunho().idade).toBeNull();
    expect(c.comp.detalheLider()).toBeNull();
  });
});
