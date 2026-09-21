import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TopbarComponent, ROTAS_MENU } from '../topbar/topbar.component';
import { RodapeComponent } from '../rodape/rodape.component';
import { AuthService } from '../auth.service';
import { ContaDaNota, NOTA_MAXIMA, NOTA_MINIMA, PENALIDADE_ACIMA_DO_TETO, PONTOS_POR_ETIQUETA, contaDaNota } from '../shared/conta-da-nota';

export interface Entrada { ordem: string; titulo: string; texto: string; }
export interface Limite { titulo: string; texto: string; }
export interface EtiquetaEscolha { chave: string; rotulo: string; }
export interface OpcaoTeto { rotulo: string; valor: number | null; }

/** Uma parcela da conta ("45", "+ 14", "− 30") e o que ela representa. */
export interface Parcela { sinal: '' | '+' | '−'; valor: number; legenda: string; tipo: 'partida' | 'etiqueta' | 'desconto'; }

@Component({
  selector: 'seia-sobre-ia',
  standalone: true,
  imports: [CommonModule, TopbarComponent, RodapeComponent],
  templateUrl: './sobre-ia.component.html',
  styleUrl: './sobre-ia.component.css',
})
export class SobreIaComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  readonly entradas: Entrada[] = [
    { ordem: 'Entrada 01', titulo: 'O que você escreve', texto: 'Rotina, passageiros, tipo de estrada e teto de orçamento, em texto livre.' },
    { ordem: 'Entrada 02', titulo: 'Palavras de uso', texto: 'O sistema procura termos como família, estrada, cidade, off-road, trabalho, economia ou elétrico, e valores como "250 mil".' },
    { ordem: 'Entrada 03', titulo: 'Perfil de cada modelo', texto: 'Cada modelo Ford do catálogo tem etiquetas de uso. Exemplo: Territory = família, viagem, estrada, cidade.' },
  ];

  // ---- A conta aberta: o Territory com etiquetas que a pessoa liga e desliga ----
  readonly modelo = 'Territory';
  readonly precoDe = 219900;
  /** As mesmas etiquetas do Territory no catálogo do /modelos. */
  readonly tagsDoModelo = ['familia', 'viagem', 'estrada', 'cidade'];

  readonly etiquetas: EtiquetaEscolha[] = [
    { chave: 'familia', rotulo: 'família' },
    { chave: 'estrada', rotulo: 'estrada' },
    { chave: 'viagem', rotulo: 'viagem' },
    { chave: 'cidade', rotulo: 'cidade' },
    { chave: 'offroad', rotulo: 'off-road' },
    { chave: 'trabalho', rotulo: 'trabalho' },
    { chave: 'economia', rotulo: 'economia' },
  ];

  readonly tetos: OpcaoTeto[] = [
    { rotulo: 'Sem teto', valor: null },
    { rotulo: 'Até R$ 250 mil', valor: 250000 },
    { rotulo: 'Até R$ 200 mil', valor: 200000 },
  ];

  escolhidas = new Set<string>(['familia', 'estrada']);
  teto: number | null = 250000;

  readonly usamos = [
    'O texto que você escreve na busca (palavras de uso e orçamento)',
    'As etiquetas de uso de cada modelo',
    'O preço "a partir de" de cada modelo',
  ];

  readonly naoUsamos = [
    'Dados de crédito ou renda',
    'Estoque ou meta de venda da concessionária',
    'Seus favoritos e comparações anteriores',
  ];

  readonly limites: Limite[] = [
    { titulo: 'Reconhece palavras, não frases', texto: 'A nota vem das palavras-chave do seu texto. Se você não citar o uso, a nota fica genérica.' },
    { titulo: 'Não negocia preço', texto: 'A nota usa o preço "a partir de". Desconto é conversa com a concessionária.' },
    { titulo: 'Não garante disponibilidade', texto: 'Um modelo com nota alta pode não estar disponível na sua região.' },
    { titulo: 'Não substitui o test-drive', texto: 'Conforto e dirigibilidade só se confirmam no banco do carro.' },
    { titulo: 'Não decide por você', texto: 'A nota ordena opções. A escolha continua sua.' },
  ];

  /** Os números da regra, para o cartão de código do topo. */
  readonly regra = { pontos: PONTOS_POR_ETIQUETA, desconto: PENALIDADE_ACIMA_DO_TETO, minimo: NOTA_MINIMA, maximo: NOTA_MAXIMA };

  /** A nota vai de 0 a 100 na escala do gráfico (na prática, entre 15 e 97). */
  readonly escala = 100;

  get conta(): ContaDaNota {
    return contaDaNota(this.tagsDoModelo, [...this.escolhidas], this.precoDe, this.teto);
  }

  /** As parcelas da conta, na ordem em que aparecem: partida, uma por etiqueta que bate e o desconto de preço. */
  get parcelas(): Parcela[] {
    const c = this.conta;
    const rotulo = (chave: string) => this.etiquetas.find((e) => e.chave === chave)?.rotulo ?? chave;
    return [
      { sinal: '', valor: c.partida, legenda: c.partida === 45 ? 'ponto de partida (perfil detectado)' : 'ponto de partida (sem critérios)', tipo: 'partida' },
      ...c.acertos.map((t): Parcela => ({ sinal: '+', valor: PONTOS_POR_ETIQUETA, legenda: `etiqueta "${rotulo(t)}"`, tipo: 'etiqueta' })),
      ...(c.penalidade ? [{ sinal: '−', valor: c.penalidade, legenda: 'acima do teto', tipo: 'desconto' } as Parcela] : []),
    ];
  }

  /** Larguras da barra (em % da escala): a partida, cada etiqueta e, se houver, onde o desconto morde. */
  get barra(): { partida: number; etiquetas: number[]; desconto: { inicio: number; largura: number } | null } {
    const c = this.conta;
    let usado = 0;
    /** Reserva um trecho da barra, sem passar dos 100%. */
    const trecho = (v: number) => {
      const largura = Math.max(0, Math.min(v, this.escala - usado));
      usado += largura;
      return largura;
    };
    const partida = trecho(c.partida);
    const etiquetas = c.acertos.map(() => trecho(PONTOS_POR_ETIQUETA));
    return {
      partida,
      etiquetas,
      desconto: c.penalidade ? { inicio: Math.max(0, usado - c.penalidade), largura: Math.min(c.penalidade, usado) } : null,
    };
  }

  /** A frase sobre o preço, abaixo da conta. */
  get notaDoPreco(): { texto: string; alerta: boolean } {
    const preco = 'Preço a partir de R$ ' + this.precoDe.toLocaleString('pt-BR');
    if (this.teto === null) return { texto: `${preco}: sem teto informado, o preço não muda a nota.`, alerta: false };
    if (this.precoDe > this.teto) {
      return { texto: `${preco}: acima do teto de R$ ${(this.teto / 1000).toFixed(0)} mil, a nota perde ${PENALIDADE_ACIMA_DO_TETO} pontos.`, alerta: true };
    }
    return { texto: `${preco}: dentro do teto, sem desconto na nota.`, alerta: false };
  }

  /** Aviso quando a conta passa de 97 e a nota é cortada. */
  get avisoDeLimite(): string | null {
    const c = this.conta;
    if (c.limitada === 'maximo') return `A soma dá ${c.bruto}, mas a nota nunca passa de ${NOTA_MAXIMA}.`;
    if (c.limitada === 'minimo') return `A soma dá ${c.bruto}, mas a nota nunca fica abaixo de ${NOTA_MINIMA}.`;
    return null;
  }

  /** Etiquetas escolhidas que o Territory não tem ("off-road, trabalho"): entram no perfil, mas não pontuam. */
  get semEtiquetaTexto(): string {
    const rotulo = (chave: string) => this.etiquetas.find((e) => e.chave === chave)?.rotulo ?? chave;
    return this.conta.semEtiqueta.map(rotulo).join(', ');
  }

  get etiquetasDoModeloTexto(): string {
    return this.tagsDoModelo.map((t) => this.etiquetas.find((e) => e.chave === t)?.rotulo ?? t).join(', ');
  }

  alternarEtiqueta(chave: string): void {
    const novo = new Set(this.escolhidas);
    if (novo.has(chave)) novo.delete(chave);
    else novo.add(chave);
    this.escolhidas = novo;
  }

  escolherTeto(valor: number | null): void {
    this.teto = valor;
  }

  /** A etiqueta está ligada e o modelo tem: ela pontua. */
  pontua(chave: string): boolean {
    return this.escolhidas.has(chave) && this.tagsDoModelo.includes(chave);
  }

  // Método para tratar o evento de navegação sem conflito de tipo de evento nativo
  onNavegar(chave: string): void {
    const rota = ROTAS_MENU[chave];
    if (rota) this.router.navigateByUrl(rota);
  }

  perguntarParaSeia(): void {
    this.router.navigateByUrl('/fale-conosco');
  }

  sair(): void {
    void this.authService.logout();
  }
}
