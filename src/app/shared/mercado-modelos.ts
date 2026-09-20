/**
 * ============================================================================
 * BASE DE MERCADO — ESTIMATIVA INTERNA, NÃO VEM DA API
 * ============================================================================
 *
 * A API `cars` devolve só ficha técnica (potência, velocidade, tanque, medidas).
 * Ela não publica venda, share nem pesquisa de preferência. Tudo neste arquivo é
 * uma base editorial montada para a demonstração do Agente de Perfil.
 *
 * O painel mostra esse aviso na tela junto dos números, para ninguém levar um
 * share estimado para uma reunião executiva achando que é dado de venda real.
 *
 * Para plugar dados reais: mantenha o formato abaixo e troque os valores pela
 * extração do BI de vendas. Nenhum componente precisa mudar.
 */

export interface DriverPreferencia {
  /** Fator citado pelo comprador na decisão. */
  fator: string;
  /** % dos compradores do modelo que citam esse fator como decisivo (estimado). */
  peso: number;
}

export interface DadoMercado {
  modelo: string;
  /** Participação estimada dentro da linha Ford considerada nesta demonstração. */
  shareLinha: number;
  /** Posição estimada no ranking de emplacamento da linha. */
  posicaoVendas: number;
  /** O que esse modelo faz que os concorrentes diretos não fazem. */
  diferencial: string;
  /** Por que a massa de compradores escolhe esse modelo — usado no gráfico de drivers. */
  drivers: DriverPreferencia[];
  /** Perfil predominante de quem compra, em uma linha. */
  compradorTipico: string;
}

export const MERCADO_MODELOS: DadoMercado[] = [
  {
    modelo: 'Territory',
    shareLinha: 24,
    posicaoVendas: 1,
    diferencial: 'Entrega espaço de SUV médio com preço e consumo de SUV compacto — a faixa onde a concorrência obriga a escolher um dos dois.',
    compradorTipico: 'Casal com um ou dois filhos, 32 a 45 anos, capital ou região metropolitana.',
    drivers: [
      { fator: 'Espaço interno pelo preço', peso: 71 },
      { fator: 'Custo de manutenção', peso: 58 },
      { fator: 'Itens de série', peso: 52 },
      { fator: 'Conforto em viagem', peso: 44 },
      { fator: 'Valor de revenda', peso: 31 },
    ],
  },
  {
    modelo: 'Ranger',
    shareLinha: 21,
    posicaoVendas: 2,
    diferencial: 'A única da linha que troca de papel no mesmo dia: carga durante a semana, família no fim de semana, sem penalizar nenhum dos dois.',
    compradorTipico: 'Produtor rural, construção civil e frotas; 35 a 55 anos, cidade média ou interior.',
    drivers: [
      { fator: 'Capacidade de carga', peso: 76 },
      { fator: 'Durabilidade mecânica', peso: 69 },
      { fator: 'Valor de revenda', peso: 61 },
      { fator: 'Rede de assistência', peso: 47 },
      { fator: 'Uso misto trabalho/lazer', peso: 42 },
    ],
  },
  {
    modelo: 'Bronco Sport',
    shareLinha: 14,
    posicaoVendas: 3,
    diferencial: 'Tração e ângulos de verdade num corpo que ainda cabe em vaga de shopping — os rivais de porte parecido são 4x2 disfarçados.',
    compradorTipico: 'Casal sem filhos ou com filhos crescidos, 28 a 42 anos, alta renda urbana.',
    drivers: [
      { fator: 'Capacidade off-road real', peso: 68 },
      { fator: 'Design e presença', peso: 63 },
      { fator: 'Tamanho urbano', peso: 49 },
      { fator: 'Versatilidade de bagageiro', peso: 38 },
      { fator: 'Marca e comunidade', peso: 34 },
    ],
  },
  {
    modelo: 'Mustang Mach-E',
    shareLinha: 12,
    posicaoVendas: 4,
    diferencial: 'Elétrico que não pede troca de hábito: autonomia cobre a semana urbana inteira e ainda carrega o nome de maior apelo da marca.',
    compradorTipico: 'Primeiro elétrico da casa; 30 a 45 anos, capital, renda alta, garagem com tomada.',
    drivers: [
      { fator: 'Custo por quilômetro', peso: 74 },
      { fator: 'Isenção e benefícios urbanos', peso: 55 },
      { fator: 'Desempenho', peso: 53 },
      { fator: 'Tecnologia de bordo', peso: 51 },
      { fator: 'Imagem sustentável', peso: 36 },
    ],
  },
  {
    modelo: 'Explorer',
    shareLinha: 10,
    posicaoVendas: 5,
    diferencial: 'Sete lugares com a terceira fileira utilizável por adulto — na maior parte da concorrência ela só serve para criança.',
    compradorTipico: 'Família grande ou multigeracional, 38 a 55 anos, alta renda.',
    drivers: [
      { fator: 'Terceira fileira usável', peso: 79 },
      { fator: 'Porta-malas com 7 lugares', peso: 62 },
      { fator: 'Conforto em viagem longa', peso: 57 },
      { fator: 'Segurança percebida', peso: 48 },
      { fator: 'Status', peso: 29 },
    ],
  },
  {
    modelo: 'F-150',
    shareLinha: 8,
    posicaoVendas: 6,
    diferencial: 'Capacidade de reboque e caçamba de picape full-size, numa faixa onde o resto do mercado só oferece média.',
    compradorTipico: 'Frota, agronegócio e uso comercial pesado; decisão por planilha, não por gosto.',
    drivers: [
      { fator: 'Capacidade de reboque', peso: 81 },
      { fator: 'Robustez estrutural', peso: 72 },
      { fator: 'Custo por tonelada transportada', peso: 58 },
      { fator: 'Disponibilidade de peças', peso: 44 },
      { fator: 'Conforto de cabine', peso: 33 },
    ],
  },
  {
    modelo: 'Ranger Raptor',
    shareLinha: 6,
    posicaoVendas: 7,
    diferencial: 'Suspensão de competição de fábrica com garantia de fábrica — o equivalente preparado no aftermarket custa mais e perde a cobertura.',
    compradorTipico: 'Comprador por desejo, 30 a 50 anos, segundo ou terceiro carro da casa.',
    drivers: [
      { fator: 'Suspensão de performance', peso: 84 },
      { fator: 'Exclusividade', peso: 66 },
      { fator: 'Desempenho off-road extremo', peso: 64 },
      { fator: 'Design agressivo', peso: 52 },
      { fator: 'Garantia de fábrica no preparo', peso: 41 },
    ],
  },
  {
    modelo: 'F-150 Lightning',
    shareLinha: 3,
    posicaoVendas: 8,
    diferencial: 'Picape de trabalho que vira gerador de obra: alimenta ferramenta elétrica direto da bateria, sem gerador a diesel junto.',
    compradorTipico: 'Frota com meta de descarbonização e obra urbana com restrição de ruído.',
    drivers: [
      { fator: 'Custo operacional de frota', peso: 77 },
      { fator: 'Tomada de obra integrada', peso: 59 },
      { fator: 'Meta de emissões corporativa', peso: 54 },
      { fator: 'Torque imediato', peso: 46 },
      { fator: 'Ruído zero em obra urbana', peso: 35 },
    ],
  },
  {
    modelo: 'Mustang GT',
    shareLinha: 2,
    posicaoVendas: 9,
    diferencial: 'Um dos últimos V8 aspirados à venda — o argumento não é a métrica, é a escassez.',
    compradorTipico: 'Colecionador ou comprador por desejo, 40+, carro adicional na garagem.',
    drivers: [
      { fator: 'Motor V8 aspirado', peso: 88 },
      { fator: 'Som e experiência', peso: 74 },
      { fator: 'Ícone de marca', peso: 69 },
      { fator: 'Potencial de valorização', peso: 43 },
      { fator: 'Desempenho em pista', peso: 39 },
    ],
  },
];

export const MERCADO_POR_MODELO = new Map(MERCADO_MODELOS.map((m) => [m.modelo, m]));

/** Aviso exibido na tela sempre que um número desta base aparece. */
export const AVISO_BASE_MERCADO =
  'Share, ranking e drivers de preferência são estimativa interna para demonstração — a API de veículos não publica dados de venda. Ficha técnica e gráfico de especificações usam dados reais da API.';
