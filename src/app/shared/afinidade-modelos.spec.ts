import { ItemCosseno, ItemRanking, PerfilApi } from './api-pessoas.service';
import {
  combinarRankings, liftEmPercentual, ordenarPorLift, rotuloLocalidade,
} from './afinidade-modelos';

const REGRESSAO: ItemRanking[] = [
  { modelo: 'Gol', share_perfil_pct: 6.289, share_municipio_pct: 9.03, lift: 0.696 },
  { modelo: 'Palio', share_perfil_pct: 4.883, share_municipio_pct: 4.474, lift: 1.091 },
  { modelo: 'Fiesta', share_perfil_pct: 4.149, share_municipio_pct: 3.963, lift: 1.047 },
];

const COSSENO: ItemCosseno[] = [
  {
    modelo: 'Fiesta',
    cosseno: 0.595,
    cos_demografia: -0.087,
    cos_contexto: 0.822,
    share_estado_pct: 3.05,
    principais_fatores: [
      { caracteristica: '% da população com renda per capita > 5 SM', sentido: 'baixo', contribuicao: 0.657 },
    ],
  },
];

const PERFIL: PerfilApi = {
  genero: 'masculino',
  idade: 20,
  grupo: 'masculino 20-29',
  localidade: { tipo: 'municipio', nome: 'Campinas' },
  ajustes_de_contexto: [
    { controle: 'escolaridade|esc:superior', motivo: 'escolaridade=superior', valor_pct: 24.9 },
  ],
  extraido_nlp: null,
};

describe('combinarRankings', () => {
  it('preserva a ordem da regressão e numera a posição', () => {
    const m = combinarRankings(REGRESSAO, COSSENO);
    expect(m.map((x) => x.modelo)).toEqual(['Gol', 'Palio', 'Fiesta']);
    expect(m.map((x) => x.posicao)).toEqual([1, 2, 3]);
  });

  it('cola os fatores do cosseno no modelo correspondente', () => {
    const m = combinarRankings(REGRESSAO, COSSENO);
    expect(m[2].cosseno).toBe(0.595);
    expect(m[2].fatores.length).toBe(1);
    expect(m[2].posicaoCosseno).toBe(1);
  });

  it('deixa o cosseno nulo no modelo que só a regressão trouxe', () => {
    const m = combinarRankings(REGRESSAO, COSSENO);
    expect(m[0].cosseno).toBeNull();
    expect(m[0].fatores).toEqual([]);
  });

  it('funciona sem cosseno nenhum, que é o caso de falha parcial', () => {
    const m = combinarRankings(REGRESSAO);
    expect(m.length).toBe(3);
    expect(m.every((x) => x.cosseno === null)).toBe(true);
  });
});

describe('ordenarPorLift', () => {
  it('põe na frente quem mais desvia da média local, não quem tem mais share', () => {
    const m = ordenarPorLift(combinarRankings(REGRESSAO, COSSENO));
    // O Gol lidera o share e fica por último no lift — é justamente essa
    // inversão que o painel precisa mostrar.
    expect(m[0].modelo).toBe('Palio');
    expect(m[m.length - 1].modelo).toBe('Gol');
  });

  it('não altera o array recebido', () => {
    const original = combinarRankings(REGRESSAO, COSSENO);
    ordenarPorLift(original);
    expect(original[0].modelo).toBe('Gol');
  });
});

describe('liftEmPercentual', () => {
  it('formata acima e abaixo da média com sinal', () => {
    expect(liftEmPercentual(1.091)).toBe('+9,1%');
    expect(liftEmPercentual(0.696)).toBe('−30,4%');
    expect(liftEmPercentual(1)).toBe('+0,0%');
  });
});

describe('rotuloLocalidade', () => {
  it('nomeia município, região e estado conforme a API respondeu', () => {
    expect(rotuloLocalidade(PERFIL)).toBe('Campinas');
    expect(rotuloLocalidade({ ...PERFIL, localidade: { tipo: 'regiao', nome: 'Bauru' } })).toBe('região de Bauru');
    expect(rotuloLocalidade({ ...PERFIL, localidade: { tipo: 'estado', nome: 'São Paulo (município médio)' } }))
      .toBe('São Paulo (município médio)');
  });
});
