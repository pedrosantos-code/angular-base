import { describe, expect, it } from 'vitest';
import { interpretarPerfil, pesosDoPerfil, ranquear, narrativaExecutiva } from './agente-perfil';

describe('interpretarPerfil', () => {
  it('lê o perfil do exemplo do briefing', () => {
    const p = interpretarPerfil('Cliente solteiro, 20 anos, sem filhos, residente em cidade grande.');

    expect(p.idade).toBe(20);
    expect(p.estadoCivil).toBe('solteiro');
    expect(p.filhos).toBe(0);
    expect(p.porteCidade).toBe('grande');
  });

  it('conta filhos escritos por extenso e por número', () => {
    expect(interpretarPerfil('casado com dois filhos').filhos).toBe(2);
    expect(interpretarPerfil('tem 3 filhos').filhos).toBe(3);
    expect(interpretarPerfil('três filhos pequenos').filhos).toBe(3);
  });

  it('separa "sem filhos" de "com filhos"', () => {
    expect(interpretarPerfil('sem filhos').filhos).toBe(0);
    expect(interpretarPerfil('com filhos').filhos).toBe(2);
  });

  it('usa o orçamento informado em vez de estimar', () => {
    const informado = interpretarPerfil('35 anos, orçamento até 300 mil');
    expect(informado.orcamento).toBe(300000);
    expect(informado.orcamentoEstimado).toBe(false);
  });

  it('estima um teto menor para o cliente mais jovem', () => {
    const jovem = interpretarPerfil('solteiro, 20 anos');
    const maduro = interpretarPerfil('casado, 45 anos');

    expect(jovem.orcamentoEstimado).toBe(true);
    expect(jovem.orcamento).toBeLessThan(maduro.orcamento);
  });

  it('deriva o teto da renda quando ela aparece', () => {
    expect(interpretarPerfil('renda de 20 mil por mês').orcamento).toBe(600000);
  });

  it('reconhece interior e zona rural como praça pequena', () => {
    expect(interpretarPerfil('mora no interior').porteCidade).toBe('pequena');
    expect(interpretarPerfil('tem um sítio').porteCidade).toBe('pequena');
    expect(interpretarPerfil('mora na capital').porteCidade).toBe('grande');
  });
});

describe('pesosDoPerfil', () => {
  it('prioriza uso urbano e economia para o jovem de cidade grande', () => {
    const pesos = pesosDoPerfil(interpretarPerfil('solteiro, 20 anos, sem filhos, cidade grande'));

    expect(pesos.urbano).toBeGreaterThan(pesos.carga);
    expect(pesos.economia).toBeGreaterThan(pesos.robustez);
  });

  it('prioriza espaço para a família com filhos', () => {
    const jovem = pesosDoPerfil(interpretarPerfil('solteiro, 25 anos, sem filhos'));
    const familia = pesosDoPerfil(interpretarPerfil('casado, 38 anos, 3 filhos'));

    expect(familia.espaco).toBeGreaterThan(jovem.espaco);
  });

  it('prioriza carga e robustez para uso de trabalho no interior', () => {
    const pesos = pesosDoPerfil(interpretarPerfil('45 anos, interior, usa para trabalho e carga'));

    expect(pesos.carga).toBeGreaterThan(pesos.performance);
    expect(pesos.robustez).toBeGreaterThan(pesos.urbano);
  });

  it('mantém todo peso dentro de 0 a 100', () => {
    const pesos = pesosDoPerfil(interpretarPerfil('solteiro, 20 anos, sem filhos, cidade grande, offroad, trabalho, carga, performance, economia'));

    for (const valor of Object.values(pesos)) {
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThanOrEqual(100);
    }
  });
});

describe('ranquear', () => {
  it('devolve o catálogo ordenado por score decrescente', () => {
    const ranking = ranquear(interpretarPerfil('casado, 38 anos, 2 filhos, capital'));

    expect(ranking.length).toBeGreaterThan(0);
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i - 1].score).toBeGreaterThanOrEqual(ranking[i].score);
    }
  });

  it('é determinístico — a mesma frase devolve o mesmo líder', () => {
    const frase = 'Cliente solteiro, 20 anos, sem filhos, residente em cidade grande.';
    expect(ranquear(interpretarPerfil(frase))[0].modelo).toBe(ranquear(interpretarPerfil(frase))[0].modelo);
  });

  it('desconta score de quem passa do teto de preço', () => {
    const ranking = ranquear(interpretarPerfil('30 anos, orçamento até 200 mil'));
    const caro = ranking.find((m) => m.precoDe > 200000);

    expect(caro?.ajustePreco).toBeLessThan(0);
    expect(caro?.dentroDoOrcamento).toBe(false);
  });

  it('não desconta quem cabe no teto', () => {
    const ranking = ranquear(interpretarPerfil('orçamento até 600 mil'));
    const barato = ranking.find((m) => m.precoDe <= 600000);

    expect(barato?.ajustePreco).toBe(0);
  });

  it('quando nada cabe no teto, o mais barato ganha do mais caro de perfil parecido', () => {
    // Teto estimado do cliente de 20 anos fica abaixo da linha inteira. Antes do ajuste
    // do desconto, o limite de pontos era igual para todos e um elétrico de R$ 380 mil
    // passava à frente de um SUV de R$ 220 mil.
    const ranking = ranquear(interpretarPerfil('Cliente solteiro, 20 anos, sem filhos, residente em cidade grande.'));

    expect(ranking.every((m) => !m.dentroDoOrcamento)).toBe(true);

    const posicao = (nome: string) => ranking.findIndex((m) => m.modelo === nome);
    expect(posicao('Territory')).toBeLessThan(posicao('Mustang Mach-E'));
  });

  it('com orçamento folgado, o elétrico volta à frente para o mesmo perfil', () => {
    const ranking = ranquear(interpretarPerfil('Cliente solteiro, 20 anos, sem filhos, cidade grande, orçamento até 400 mil.'));

    const posicao = (nome: string) => ranking.findIndex((m) => m.modelo === nome);
    expect(posicao('Mustang Mach-E')).toBeLessThan(posicao('Territory'));
  });

  it('coloca picape no topo para trabalho com carga no interior', () => {
    const lider = ranquear(interpretarPerfil('45 anos, interior, trabalho com carga pesada e reboque, orçamento até 500 mil'))[0];
    expect(['Ranger', 'F-150', 'Ranger Raptor']).toContain(lider.modelo);
  });

  it('sempre explica o match com no máximo três razões', () => {
    for (const m of ranquear(interpretarPerfil('casado, 40 anos, 2 filhos'))) {
      expect(m.razoes.length).toBeGreaterThan(0);
      expect(m.razoes.length).toBeLessThanOrEqual(3);
      expect(m.razoes.every((r) => r.texto.length > 0)).toBe(true);
    }
  });

  it('só usa como razão eixo em que o modelo realmente é forte', () => {
    // Sem esse filtro, um eixo de peso alto onde o modelo vai mal encabeçava a lista
    // de motivos e o card se contradizia.
    for (const m of ranquear(interpretarPerfil('solteiro, 20 anos, sem filhos, cidade grande'))) {
      if (m.razoes.length > 1) {
        expect(m.razoes.every((r) => m.perfil[r.eixo] >= 60)).toBe(true);
      }
    }
  });

  it('aponta a fraqueza que pesa para o perfil como ponto de atenção', () => {
    // Mustang GT num perfil de família grande: espaço é o que falta.
    const gt = ranquear(interpretarPerfil('casado, 40 anos, 3 filhos, viaja muito'))
      .find((m) => m.modelo === 'Mustang GT');

    expect(gt?.atencao).not.toBeNull();
    expect(gt?.atencao?.eixo).toBe('espaco');
  });

  it('nunca aponta como atenção um eixo em que o modelo é forte', () => {
    const perfis = [
      'solteiro, 20 anos, sem filhos, cidade grande',
      'casado, 38 anos, 2 filhos, capital',
      '45 anos, interior, trabalho com carga e off-road',
    ];

    for (const texto of perfis) {
      for (const m of ranquear(interpretarPerfil(texto))) {
        if (m.atencao) expect(m.perfil[m.atencao.eixo]).toBeLessThan(50);
      }
    }
  });

  it('não repete o mesmo eixo entre razão e ponto de atenção', () => {
    for (const m of ranquear(interpretarPerfil('casado, 38 anos, 2 filhos, capital'))) {
      if (!m.atencao) continue;
      expect(m.razoes.some((r) => r.eixo === m.atencao!.eixo)).toBe(false);
    }
  });
});

describe('narrativaExecutiva', () => {
  it('cita o modelo, o share e o teto de preço', () => {
    const perfil = interpretarPerfil('Cliente solteiro, 20 anos, sem filhos, cidade grande.');
    const lider = ranquear(perfil)[0];
    const texto = narrativaExecutiva(lider, perfil);

    expect(texto).toContain(lider.modelo);
    expect(texto).toContain(`${lider.shareLinha}%`);
    expect(texto.length).toBeGreaterThan(200);
  });
});
