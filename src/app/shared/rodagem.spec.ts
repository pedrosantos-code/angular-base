import { describe, expect, it } from 'vitest';
import { avaliarUso, DadosDeUso, mesesEntreRevisoes, PrecosEnergia, revisoesPorAno, UsoEstimado } from './rodagem';

// Dados FICTÍCIOS, só para testar a conta. A tabela real da equipe vive em DADOS_DE_USO.
const PRECOS: PrecosEnergia = { gasolina: 6, diesel: 6, energia: 1 };
const DADOS: Record<string, DadosDeUso> = {
  barato: { consumo: 12, intervaloRevisaoKm: 10000, precoRevisao: 1200, desgastePorKm: 0.1 },
  caro: { consumo: 6, intervaloRevisaoKm: 10000, precoRevisao: 2400, desgastePorKm: 0.2 },
  eletrico: { consumo: 6, intervaloRevisaoKm: 15000, precoRevisao: 900, desgastePorKm: 0.1, autonomiaKm: 400 },
};
const CARROS = [
  { id: 'barato', tipo: 'combustao' as const },
  { id: 'caro', tipo: 'combustao' as const },
  { id: 'eletrico', tipo: 'eletrico' as const },
  { id: 'sem-dados', tipo: 'combustao' as const },
];

describe('revisões', () => {
  it('conta revisões por ano para cima, no mínimo 1 pelo prazo de 12 meses', () => {
    expect(revisoesPorAno(500, 10000)).toBe(1); // 6.000 km/ano
    expect(revisoesPorAno(1000, 10000)).toBe(2); // 12.000 km/ano
    expect(revisoesPorAno(2000, 10000)).toBe(3); // 24.000 km/ano → 2,4 → 3
  });

  it('revisão a cada N meses no ritmo do usuário, entre 1 e 12', () => {
    expect(mesesEntreRevisoes(1000, 10000)).toBe(10);
    expect(mesesEntreRevisoes(500, 10000)).toBe(12);
    expect(mesesEntreRevisoes(20000, 10000)).toBe(1);
  });
});

describe('avaliarUso', () => {
  it('sem rodagem informada não calcula nada', () => {
    const r = avaliarUso(CARROS, null, DADOS, PRECOS);
    expect(Object.values(r).every((x) => x.estado === 'sem-rodagem')).toBe(true);
  });

  it('carro sem dados fica indisponível e não entra no menor custo', () => {
    const r = avaliarUso(CARROS, 1000, DADOS, PRECOS);
    expect(r['sem-dados']).toEqual({ estado: 'indisponivel' });
  });

  it('carro sem o preço da energia dele também fica indisponível (nada é inventado)', () => {
    const r = avaliarUso(CARROS, 1000, DADOS, { gasolina: 6 });
    expect(r['eletrico']).toEqual({ estado: 'indisponivel' });
    expect(r['barato'].estado).toBe('ok');
  });

  it('calcula custo mensal = energia + revisão + desgaste', () => {
    // barato a 1.000 km/mês: energia 1000/12×6 = 500; revisões 2×1200/12 = 200; desgaste 100 → 800
    const barato = avaliarUso(CARROS, 1000, DADOS, PRECOS)['barato'] as UsoEstimado;
    expect(barato.custoMes).toBeCloseTo(800, 5);
    expect(barato.revisaoACadaMeses).toBe(10);
  });

  it('nota = menor custo ÷ custo do carro × 100, arredondada para baixo', () => {
    const r = avaliarUso(CARROS, 1000, DADOS, PRECOS);
    // eletrico: energia 1000/6×1 ≈ 166,7; revisão 1×900/12 = 75; desgaste 100 → ≈ 341,7, o menor de todos (nota 100)
    expect((r['eletrico'] as UsoEstimado).nota).toBe(100);
    // barato custa 800 → 341,67 ÷ 800 = 42,7 → 42
    expect((r['barato'] as UsoEstimado).nota).toBe(42);
    // caro: energia 1000/6×6 = 1000; revisões 2×2400/12 = 400; desgaste 200 → 1600 → 341,67 ÷ 1600 = 21,3 → 21
    expect((r['caro'] as UsoEstimado).nota).toBe(21);
  });

  it('elétrico acima de 70% da autonomia por dia perde 20 pontos e pede o aviso de recarga', () => {
    // 400 km × 70% = 280 km/dia → 280 × 22 = 6.160 km/mês
    const dentro = avaliarUso(CARROS, 6160, DADOS, PRECOS)['eletrico'] as UsoEstimado;
    expect(dentro.recarga).toBe(false);
    const fora = avaliarUso(CARROS, 6200, DADOS, PRECOS)['eletrico'] as UsoEstimado;
    expect(fora.recarga).toBe(true);
    expect(fora.nota).toBeLessThanOrEqual(80);
  });
});
