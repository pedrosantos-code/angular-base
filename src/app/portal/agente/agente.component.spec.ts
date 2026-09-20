import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FONTE_VEICULOS, fonteVazia } from '../../shared/fonte-veiculos';
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

const INSIGHT_EXEMPLO: Insights = {
  veredito: 'O ranking faz sentido para este perfil.',
  concordaComRanking: true,
  leituraPerfil: 'Cliente jovem, sensível a custo de uso.',
  riscos: [{ titulo: 'Orçamento', texto: 'Todos os modelos passam do teto estimado.' }],
  argumentosVenda: [{ titulo: 'Custo por km', texto: 'Consumo baixo segura o custo mensal.' }],
  perguntasDoGestor: [{ pergunta: 'Por que não o elétrico?', resposta: 'Preço fora do alcance.' }],
};

describe('AgenteComponent · camada de IA', () => {
  function criar() {
    const ia = new IaFalsa();
    TestBed.configureTestingModule({
      imports: [AgenteComponent],
      providers: [
        provideRouter([]),
        { provide: FONTE_VEICULOS, useValue: fonteVazia('stub de teste') },
        { provide: AnaliseIaService, useValue: ia },
      ],
    });
    const fixture = TestBed.createComponent(AgenteComponent);
    fixture.detectChanges();
    return { fixture, ia, comp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  /** Roda a análise determinística, que é o que destrava o resto do painel. */
  function analisar(c: ReturnType<typeof criar>) {
    c.comp.descricao = 'Cliente solteiro, 20 anos, sem filhos, cidade grande.';
    c.comp.analisar();
    c.fixture.detectChanges();
  }

  it('só mostra o bloco de IA depois de uma análise', () => {
    const c = criar();
    expect(c.el.querySelector('.ag-ia')).toBeNull();

    analisar(c);
    expect(c.el.querySelector('.ag-ia')).not.toBeNull();
  });

  it('manda para a IA os números já calculados, não a frase crua', async () => {
    const c = criar();
    analisar(c);
    c.ia.proximoInsight = INSIGHT_EXEMPLO;

    await c.comp.gerarInsights();

    const payload = c.ia.ultimoPayload as Record<string, unknown>;
    expect(payload['ranking']).toBeDefined();
    expect(payload['pesosPorEixo']).toBeDefined();
    // O aviso de estimativa precisa viajar junto, senão o modelo trata share como venda real.
    expect(String(payload['avisoSobreDadosDeMercado'])).toContain('estimativa interna');
  });

  it('renderiza as seções do insight', async () => {
    const c = criar();
    analisar(c);
    c.ia.proximoInsight = INSIGHT_EXEMPLO;

    await c.comp.gerarInsights();
    c.fixture.detectChanges();

    expect(c.el.querySelector('.ag-veredito-texto')?.textContent).toContain('faz sentido');
    expect(c.el.querySelectorAll('.ag-ia-item--risco').length).toBe(1);
    expect(c.el.querySelectorAll('.ag-ia-qa').length).toBe(1);
  });

  it('mostra erro legível quando a função não responde', async () => {
    const c = criar();
    analisar(c);
    c.ia.proximaFalha = 'Não foi possível falar com a função de IA.';

    await c.comp.gerarInsights();
    c.fixture.detectChanges();

    expect(c.el.querySelector('.ag-ia .ag-estado--erro')?.textContent).toContain('função de IA');
    expect(c.comp.insights()).toBeNull();
  });

  it('acumula as perguntas na conversa', async () => {
    const c = criar();
    analisar(c);

    c.comp.pergunta = 'E se o orçamento subir?';
    await c.comp.enviarPergunta();

    expect(c.comp.conversa().length).toBe(1);
    expect(c.comp.conversa()[0].resposta).toContain('E se o orçamento subir?');
    expect(c.comp.pergunta).toBe(''); // campo limpo depois do envio
  });

  it('devolve o texto digitado quando a pergunta falha', async () => {
    const c = criar();
    analisar(c);
    c.ia.proximaFalha = 'Sua sessão expirou.';

    c.comp.pergunta = 'pergunta importante';
    await c.comp.enviarPergunta();

    expect(c.comp.conversa().length).toBe(0);
    expect(c.comp.pergunta).toBe('pergunta importante');
    expect(c.comp.erroIa()).toContain('sessão');
  });

  it('descarta a leitura da IA ao analisar outro cliente', async () => {
    const c = criar();
    analisar(c);
    c.ia.proximoInsight = INSIGHT_EXEMPLO;
    await c.comp.gerarInsights();
    expect(c.comp.insights()).not.toBeNull();

    // A opinião era sobre o cliente anterior — deixá-la na tela seria enganoso.
    c.comp.descricao = 'Casal, 40 anos, 3 filhos, interior.';
    c.comp.analisar();

    expect(c.comp.insights()).toBeNull();
    expect(c.comp.conversa().length).toBe(0);
  });
});
