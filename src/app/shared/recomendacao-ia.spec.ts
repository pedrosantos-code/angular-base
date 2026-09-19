import { describe, expect, it } from 'vitest';
import { calcularNota, detectarOrcamento, detectarTags, formatarPerfil } from './recomendacao-ia';

describe('detectarTags', () => {
  it('acha várias tags no mesmo texto', () => {
    const tags = detectarTags('Viajo com a família pela estrada todo fim de semana');
    expect(tags).toEqual(expect.arrayContaining(['familia', 'viagem', 'estrada', 'aventura']));
  });

  it('ignora maiúsculas e acentuação alternativa', () => {
    expect(detectarTags('FAMÍLIA')).toContain('familia');
    expect(detectarTags('familia')).toContain('familia');
  });

  it('aceita flexões de palavras longas (viagens, trilhas)', () => {
    expect(detectarTags('faço viagens')).toContain('viagem');
    expect(detectarTags('gosto de trilhas')).toContain('offroad');
  });

  it('não confunde palavras que só contêm uma palavra-chave', () => {
    expect(detectarTags('adoro a paisagem')).not.toContain('familia'); // "pais"
    expect(detectarTags('comprei um apple')).not.toContain('trabalho'); // "app"
    expect(detectarTags('meu carro favorito')).not.toContain('familia'); // "avo"
    expect(detectarTags('tenho um terraço')).not.toContain('offroad'); // "terra"
  });

  it('aceita palavras curtas inteiras, inclusive no plural', () => {
    expect(detectarTags('vou com meus pais')).toContain('familia');
    expect(detectarTags('uso um app de corrida')).toContain('trabalho');
  });

  it('reconhece prefixo com hífen seguido de número (br-116)', () => {
    expect(detectarTags('rodo na br-116')).toContain('estrada');
  });

  it('devolve lista vazia quando nada bate', () => {
    expect(detectarTags('')).toEqual([]);
    expect(detectarTags('xyz')).toEqual([]);
  });
});

describe('detectarOrcamento', () => {
  it('lê "250 mil" e "R$ 250 mil"', () => {
    expect(detectarOrcamento('até 250 mil')).toBe(250000);
    expect(detectarOrcamento('orçamento de R$ 300 mil')).toBe(300000);
  });

  it('devolve null sem orçamento', () => {
    expect(detectarOrcamento('quero um carro bom')).toBeNull();
  });

  it('não trata "milhas" ou "milhão" como orçamento', () => {
    expect(detectarOrcamento('rodo 60 milhas por semana')).toBeNull();
    expect(detectarOrcamento('1 milhão de motivos')).toBeNull();
  });
});

describe('calcularNota', () => {
  it('sem tags detectadas dá a nota neutra (55)', () => {
    expect(calcularNota(['familia'], [], 200000, null)).toBe(55);
  });

  it('soma 14 pontos por tag acertada em cima de 45', () => {
    expect(calcularNota(['familia', 'viagem'], ['familia'], 200000, null)).toBe(59);
    expect(calcularNota(['familia', 'viagem'], ['familia', 'viagem'], 200000, null)).toBe(73);
  });

  it('desconta 30 quando o preço passa do orçamento', () => {
    expect(calcularNota(['familia'], ['familia'], 300000, 250000)).toBe(29);
  });

  it('não desconta quando cabe no orçamento', () => {
    expect(calcularNota(['familia'], ['familia'], 200000, 250000)).toBe(59);
  });

  it('respeita os limites de 15 e 97', () => {
    expect(calcularNota([], ['a'], 900000, 100000)).toBe(15);
    const muitas = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(calcularNota(muitas, muitas, 100000, null)).toBe(97);
  });
});

describe('formatarPerfil', () => {
  it('junta as tags e o orçamento', () => {
    expect(formatarPerfil(['familia', 'estrada'], 250000)).toBe('familia, estrada, até R$ 250 mil');
  });

  it('avisa quando não há critérios', () => {
    expect(formatarPerfil([], null)).toBe('sem critérios claros no texto');
  });
});
