import { EfeitoContexto, GrupoLift } from './api-pessoas.service';
import {
  diferencaConfiavel, diferencaCurta, diferencaLegivel, frequenciaLegivel,
  leituraDoEfeito, resumoExecutivo, rotuloGrupo, rotuloGrupoCurto,
} from './linguagem-executiva';

function efeito(p: Partial<EfeitoContexto>): EfeitoContexto {
  return {
    controle: 'renda|renda>5SM',
    descricao: '% da população com renda per capita > 5 SM',
    efeito_pct_por_dp: -22.7,
    ic90_pct: [-30.5, -15.8],
    distinguivel_de_zero: true,
    ...p,
  };
}

function grupo(p: Partial<GrupoLift>): GrupoLift {
  return { grupo: 'H 20-29', lift: 1.03, mix_pct: 3.2, lift_ic90: [1.01, 1.05], ...p };
}

describe('frequenciaLegivel', () => {
  it('troca porcentagem de frota por "1 em cada N"', () => {
    expect(frequenciaLegivel(8.139)).toBe('1 em cada 12');
    expect(frequenciaLegivel(6.289)).toBe('1 em cada 16');
    expect(frequenciaLegivel(50)).toBe('1 em cada 2');
  });

  it('não divide por zero', () => {
    expect(frequenciaLegivel(0)).toBe('nenhum');
  });
});

describe('diferencaLegivel', () => {
  it('diz mais ou menos que a média, sem falar em lift', () => {
    expect(diferencaLegivel(0.696)).toBe('30% menos que a média da cidade');
    expect(diferencaLegivel(1.18)).toBe('18% mais que a média da cidade');
  });

  it('trata a média exata como igualdade, não como 0% mais', () => {
    expect(diferencaLegivel(1)).toBe('igual à média da cidade');
  });

  it('não usa a palavra lift em nenhuma saída', () => {
    for (const v of [0.4, 0.9, 1, 1.5, 2.2]) {
      expect(diferencaLegivel(v).toLowerCase()).not.toContain('lift');
    }
  });
});

describe('diferencaCurta', () => {
  it('formata para cartão e rótulo', () => {
    expect(diferencaCurta(1.18)).toBe('+18%');
    expect(diferencaCurta(0.696)).toBe('−30%');
    expect(diferencaCurta(1)).toBe('+0%');
  });
});

describe('rotuloGrupo', () => {
  it('entende o formato do perfil da consulta', () => {
    expect(rotuloGrupo('masculino 20-29')).toBe('Homens de 20 a 29 anos');
    expect(rotuloGrupo('feminino 30-39')).toBe('Mulheres de 30 a 39 anos');
  });

  it('entende o formato abreviado da tabela por grupo', () => {
    expect(rotuloGrupo('H 40-49')).toBe('Homens de 40 a 49 anos');
    expect(rotuloGrupo('M 50-59')).toBe('Mulheres de 50 a 59 anos');
  });

  it('resolve a faixa aberta do topo', () => {
    expect(rotuloGrupo('H 60+')).toBe('Homens 60 anos ou mais');
    expect(rotuloGrupo('M 60+')).toBe('Mulheres 60 anos ou mais');
  });

  it('encurta para caber no eixo do gráfico', () => {
    expect(rotuloGrupoCurto('H 20-29')).toBe('Homens 20-29');
    expect(rotuloGrupoCurto('M 60+')).toBe('Mulheres 60+');
  });
});

describe('diferencaConfiavel', () => {
  it('aceita o grupo cujo intervalo fica todo de um lado da base', () => {
    expect(diferencaConfiavel(grupo({ lift_ic90: [1.056, 1.156] }))).toBe(true);
    expect(diferencaConfiavel(grupo({ lift_ic90: [0.823, 0.901] }))).toBe(true);
  });

  it('recusa o grupo cujo intervalo atravessa a base', () => {
    // 0,971 a 1,108 inclui 1: esse grupo pode não diferir de nada.
    expect(diferencaConfiavel(grupo({ lift_ic90: [0.971, 1.108] }))).toBe(false);
  });
});

describe('leituraDoEfeito', () => {
  it('afirma o sentido sem citar desvio padrão', () => {
    const l = leituraDoEfeito(efeito({ efeito_pct_por_dp: -22.7 }));
    expect(l.conclusivo).toBe(true);
    expect(l.texto).toBe('Aparece menos em cidades com mais gente de renda alta.');
    expect(l.texto).not.toContain('desvio');
  });

  it('inverte a frase quando o efeito é positivo', () => {
    const l = leituraDoEfeito(efeito({ controle: 'situacao|rural', efeito_pct_por_dp: 12.9 }));
    expect(l.texto).toBe('Aparece mais em cidades com mais população rural.');
  });

  it('marca como sem evidência o efeito que cruza o zero', () => {
    // É o caso que não pode virar argumento de venda na reunião.
    const l = leituraDoEfeito(efeito({ controle: 'situacao|rural', distinguivel_de_zero: false }));
    expect(l.conclusivo).toBe(false);
    expect(l.texto).toContain('Sem evidência');
  });

  it('cai na descrição da base quando o controle é novo', () => {
    const l = leituraDoEfeito(efeito({ controle: 'novo|controle', descricao: 'algo novo' }));
    expect(l.texto).toContain('algo novo');
  });
});

describe('resumoExecutivo', () => {
  const base = {
    localidade: 'Campinas',
    grupo: 'masculino 20-29',
    lider: { modelo: 'Gol', sharePerfilPct: 6.289, lift: 0.696 },
    maiorPreferencia: { modelo: 'HB20', sharePerfilPct: 3.3, lift: 1.18 },
    leituras: [leituraDoEfeito(efeito({ efeito_pct_por_dp: -22.7 }))],
  };

  it('abre pelo carro mais comum, em linguagem de frequência', () => {
    expect(resumoExecutivo(base)).toContain('o carro mais comum é o Gol: 1 em cada 16 do grupo');
  });

  it('separa ser o mais comum de ser o preferido', () => {
    const t = resumoExecutivo(base);
    expect(t).toContain('Não é preferência do grupo');
    expect(t).toContain('30% menos que a média da cidade');
  });

  it('reconhece quando o líder também é preferência real', () => {
    const t = resumoExecutivo({ ...base, lider: { modelo: 'Gol', sharePerfilPct: 6.289, lift: 1.2 } });
    expect(t).toContain('preferência real do grupo');
    expect(t).toContain('20% mais que a média da cidade');
  });

  it('aponta a aposta quando ela não é o líder de frequência', () => {
    expect(resumoExecutivo(base)).toContain('A aposta do grupo é o HB20');
  });

  it('não repete o modelo quando líder e aposta coincidem', () => {
    const t = resumoExecutivo({
      ...base,
      maiorPreferencia: { modelo: 'Gol', sharePerfilPct: 6.289, lift: 0.696 },
    });
    expect(t).not.toContain('A aposta do grupo');
  });

  it('usa só explicação conclusiva, nunca a que não tem evidência', () => {
    const t = resumoExecutivo({
      ...base,
      leituras: [
        leituraDoEfeito(efeito({ controle: 'situacao|rural', distinguivel_de_zero: false })),
        leituraDoEfeito(efeito({ efeito_pct_por_dp: -22.7 })),
      ],
    });
    expect(t).toContain('O que mais explica: aparece menos em cidades');
    expect(t).not.toContain('Sem evidência');
  });

  it('nomeia o grupo em português, não no código da base', () => {
    const t = resumoExecutivo(base);
    expect(t).toContain('entre homens de 20 a 29 anos');
    expect(t).not.toContain('masculino 20-29');
  });

  it('fecha com a ressalva, porque o texto é copiado para fora do painel', () => {
    expect(resumoExecutivo(base)).toContain('não para prever o que um cliente específico');
  });

  it('não vaza jargão nenhum para o slide', () => {
    const t = resumoExecutivo(base).toLowerCase();
    for (const termo of ['lift', 'cosseno', 'desvio padrão', 'regressão', 'ic90', 'share']) {
      expect(t).not.toContain(termo);
    }
  });
});
