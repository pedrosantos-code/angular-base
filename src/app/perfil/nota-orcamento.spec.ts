import { describe, expect, it } from 'vitest';
import { coberturaDoOrcamento, notaDeOrcamento } from './perfil.component';

describe('coberturaDoOrcamento', () => {
  it('bate com o exemplo de um orçamento de R$ 250.000', () => {
    const esperado: [number, number][] = [
      [219900, 100], [249900, 100], [259900, 96], [379900, 65], [429900, 58], [549900, 45], [599900, 41],
    ];
    for (const [preco, pct] of esperado) expect(coberturaDoOrcamento(preco, 250000), String(preco)).toBe(pct);
  });

  it('vale 100 quando o orçamento é igual ou maior que o preço', () => {
    expect(coberturaDoOrcamento(219900, 219900)).toBe(100);
    expect(coberturaDoOrcamento(219900, 1000000)).toBe(100);
  });

  it('arredonda sempre para baixo, sem subir a porcentagem', () => {
    expect(coberturaDoOrcamento(100, 65.8)).toBe(65);
    expect(coberturaDoOrcamento(219900, 219899)).toBe(99);
    expect(coberturaDoOrcamento(219900, 1)).toBe(0);
  });
});

describe('notaDeOrcamento', () => {
  it('vale 100 quando o preço cabe no teto', () => {
    expect(notaDeOrcamento(200000, 250000)).toBe(100);
    expect(notaDeOrcamento(250000, 250000)).toBe(100);
  });

  it('cai de 100 para 50 até 10% acima do teto', () => {
    expect(notaDeOrcamento(255000, 250000)).toBeCloseTo(90, 5);
    expect(notaDeOrcamento(275000, 250000)).toBeCloseTo(50, 5);
  });

  it('cai de 50 para 0 entre 10% e 30% acima do teto', () => {
    expect(notaDeOrcamento(300000, 250000)).toBeCloseTo(25, 5);
    expect(notaDeOrcamento(325000, 250000)).toBeCloseTo(0, 5);
  });

  it('vale 0 com mais de 30% acima do teto', () => {
    expect(notaDeOrcamento(400000, 250000)).toBe(0);
    expect(notaDeOrcamento(219900, 1)).toBe(0);
  });
});
