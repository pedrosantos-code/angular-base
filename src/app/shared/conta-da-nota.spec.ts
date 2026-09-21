import { describe, expect, it } from 'vitest';
import { calcularNota } from './recomendacao-ia';
import { contaDaNota } from './conta-da-nota';

const TERRITORY = ['familia', 'viagem', 'estrada', 'cidade'];

describe('contaDaNota', () => {
  it('reproduz o exemplo da página: 45 + 14 + 14 = 73', () => {
    const c = contaDaNota(TERRITORY, ['familia', 'estrada'], 219900, 250000);
    expect(c.partida).toBe(45);
    expect(c.acertos).toEqual(['familia', 'estrada']);
    expect(c.penalidade).toBe(0);
    expect(c.nota).toBe(73);
    expect(c.limitada).toBeNull();
  });

  it('etiqueta que o modelo não tem não soma pontos', () => {
    const c = contaDaNota(TERRITORY, ['familia', 'offroad'], 219900, null);
    expect(c.acertos).toEqual(['familia']);
    expect(c.semEtiqueta).toEqual(['offroad']);
    expect(c.nota).toBe(59);
  });

  it('acima do teto desconta 30 pontos', () => {
    const c = contaDaNota(TERRITORY, ['familia', 'estrada'], 219900, 200000);
    expect(c.penalidade).toBe(30);
    expect(c.nota).toBe(43);
  });

  it('sem nenhuma etiqueta a nota parte de 55', () => {
    const c = contaDaNota(TERRITORY, [], 219900, null);
    expect(c.partida).toBe(55);
    expect(c.nota).toBe(55);
  });

  it('a nota é cortada em 97 (e avisa que foi cortada)', () => {
    const c = contaDaNota(TERRITORY, ['familia', 'estrada', 'viagem', 'cidade'], 219900, null);
    expect(c.bruto).toBe(101);
    expect(c.nota).toBe(97);
    expect(c.limitada).toBe('maximo');
  });

  it('sempre devolve exatamente o que calcularNota calcula', () => {
    const tags = ['familia', 'estrada', 'cidade', 'offroad', 'trabalho'];
    for (let n = 0; n <= tags.length; n++) {
      for (const teto of [null, 150000, 250000]) {
        const escolhidas = tags.slice(0, n);
        expect(contaDaNota(TERRITORY, escolhidas, 219900, teto).nota).toBe(calcularNota(TERRITORY, escolhidas, 219900, teto));
      }
    }
  });
});
