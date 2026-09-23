import {
  IDADE_MINIMA, consultaDoPerfil, fatosDoPerfil, faltasDoPerfil, interpretarPerfil,
} from './perfil-demografico';

describe('interpretarPerfil · leitura do texto livre', () => {
  it('lê idade e gênero explícito', () => {
    const p = interpretarPerfil('Homem de 24 anos, solteiro, mora em Campinas.');
    expect(p.idade).toBe(24);
    expect(p.genero).toBe('masculino');
    expect(p.generoExplicito).toBe(true);
  });

  it('deduz o gênero pela concordância quando ninguém escreveu', () => {
    const p = interpretarPerfil('Cliente solteira, 31 anos, ensino superior.');
    expect(p.genero).toBe('feminino');
    // A marca de inferido é o que avisa quem revisa que isso foi dedução gramatical.
    expect(p.generoExplicito).toBe(false);
  });

  it('não inventa gênero quando o texto não dá pista', () => {
    const p = interpretarPerfil('Cliente de 40 anos, ensino médio, capital.');
    expect(p.genero).toBeNull();
  });

  it('lê renda só em salários mínimos, que é a unidade da API', () => {
    expect(interpretarPerfil('renda per capita de 3 salários mínimos').rendaPerCapitaSm).toBe(3);
    expect(interpretarPerfil('renda de 1,5 salário mínimo').rendaPerCapitaSm).toBe(1.5);
    // Reais não são convertidos: o fator exigiria fixar o salário do ano.
    expect(interpretarPerfil('renda de 5 mil reais').rendaPerCapitaSm).toBeNull();
  });

  it('classifica escolaridade nos valores que a API aceita', () => {
    expect(interpretarPerfil('tem faculdade').escolaridade).toBe('superior');
    expect(interpretarPerfil('ensino médio completo').escolaridade).toBe('medio');
    expect(interpretarPerfil('fundamental incompleto').escolaridade).toBe('fundamental_incompleto');
    expect(interpretarPerfil('só o fundamental').escolaridade).toBe('fundamental');
  });

  it('distingue fundamental incompleto de fundamental completo', () => {
    // O incompleto é um controle diferente na API; cair no genérico mudaria o recorte.
    expect(interpretarPerfil('não completou o fundamental').escolaridade).toBe('fundamental_incompleto');
  });

  it('lê área rural e urbana', () => {
    expect(interpretarPerfil('mora em zona rural').area).toBe('rural');
    expect(interpretarPerfil('mora numa fazenda').area).toBe('rural');
    expect(interpretarPerfil('mora na capital').area).toBe('urbana');
  });

  it('extrai o município preservando acento e maiúscula', () => {
    expect(interpretarPerfil('Mulher de 30 anos, mora em São José dos Campos.').municipio)
      .toBe('São José dos Campos');
  });

  it('usa jovem e aposentado como faixa quando não há número', () => {
    expect(interpretarPerfil('cliente jovem, solteiro').idade).toBe(23);
    expect(interpretarPerfil('homem aposentado').idade).toBe(65);
  });
});

describe('faltasDoPerfil · o que bloqueia a consulta', () => {
  it('cobra idade e gênero, que são obrigatórios na API', () => {
    const faltas = faltasDoPerfil(interpretarPerfil('cliente da capital'));
    expect(faltas).toContain('idade');
    expect(faltas).toContain('gênero');
  });

  it('rejeita idade abaixo do mínimo da base em vez de mandar um 422', () => {
    const p = interpretarPerfil('Homem de 18 anos, solteiro.');
    expect(p.idade).toBe(18);
    // A API responde 422 abaixo de 20; barrar aqui dá mensagem em português.
    expect(faltasDoPerfil(p).join()).toContain(`${IDADE_MINIMA} anos`);
  });

  it('libera a consulta quando idade e gênero estão presentes', () => {
    expect(faltasDoPerfil(interpretarPerfil('Homem de 24 anos.'))).toEqual([]);
  });
});

describe('consultaDoPerfil · tradução para a API', () => {
  it('manda município e descarta região, para o recorte não ficar ambíguo', () => {
    const p = { ...interpretarPerfil('Homem de 30 anos.'), municipio: 'Campinas', regiao: 'Campinas' };
    const c = consultaDoPerfil(p);
    expect(c.municipio).toBe('Campinas');
    expect(c.regiao).toBeNull();
  });

  it('mantém a região quando não há município', () => {
    const p = { ...interpretarPerfil('Mulher de 30 anos.'), municipio: null, regiao: 'Sorocaba' };
    expect(consultaDoPerfil(p).regiao).toBe('Sorocaba');
  });

  it('não inventa campo opcional que o texto não trouxe', () => {
    const c = consultaDoPerfil(interpretarPerfil('Homem de 30 anos.'));
    expect(c.renda_per_capita_sm).toBeNull();
    expect(c.escolaridade).toBeNull();
    expect(c.area).toBeNull();
  });
});

describe('fatosDoPerfil · painel de premissas', () => {
  it('marca como não lido o gênero que veio de concordância', () => {
    const fatos = fatosDoPerfil(interpretarPerfil('Cliente solteira, 31 anos.'));
    const genero = fatos.find((f) => f.rotulo === 'Gênero')!;
    expect(genero.valor).toBe('Feminino');
    expect(genero.lido).toBe(false);
  });

  it('diz que o recorte caiu no estado quando não há município nem região', () => {
    const fatos = fatosDoPerfil(interpretarPerfil('Homem de 30 anos.'));
    const municipio = fatos.find((f) => f.rotulo === 'Município')!;
    expect(municipio.valor).toContain('estado de SP');
    expect(municipio.lido).toBe(false);
  });

  it('não tem linha de preço nem de orçamento', () => {
    // A API Pessoas não publica preço; uma linha dessas seria número inventado.
    const rotulos = fatosDoPerfil(interpretarPerfil('Homem de 30 anos.')).map((f) => f.rotulo);
    expect(rotulos.join(' ').toLowerCase()).not.toContain('preço');
    expect(rotulos.join(' ').toLowerCase()).not.toContain('orçamento');
  });
});
