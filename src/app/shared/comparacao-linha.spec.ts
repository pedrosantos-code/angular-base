import { Car } from '../ford-api.service';
import {
  SEGMENTOS, chaveRival, escolherVersao, modeloDaBusca, montarComparacao, potenciaDoCarro, versaoFord, versaoRival,
} from './comparacao-linha';

function carro(parcial: Partial<Car>): Car {
  return {
    id: 1, make: 'FORD', model: 'Ranger', variant: null, yearFrom: null, yearTo: null, engineFuelType: null,
    enginePowerBhp: null, enginePowerKw: null, gearboxType: null, gears: null, drivetrain: null,
    topSpeedKph: null, fuelTankLitres: null, lengthMm: null, widthMm: null, heightMm: null, ...parcial,
  };
}

describe('comparacao-linha', () => {
  it('pega a potência do nome da versão quando o campo vem vazio', () => {
    expect(potenciaDoCarro(carro({ variant: '2.7L V6 10AT AWD (319 HP)' }))).toBe(319);
    expect(potenciaDoCarro(carro({ enginePowerBhp: 315.4 }))).toBe(315);
    expect(potenciaDoCarro(carro({ variant: '2.3L 10AT' }))).toBeNull();
  });

  it('escolhe a versão mais recente e, nesse ano, a mais potente', () => {
    const escolhido = escolherVersao([
      carro({ id: 1, yearFrom: 2012, enginePowerBhp: 300 }),
      carro({ id: 2, yearFrom: 2024, enginePowerBhp: 270 }),
      carro({ id: 3, yearFrom: 2024, enginePowerBhp: 315 }),
    ]);
    expect(escolhido?.id).toBe(3);
  });

  it('prefere versões com potência informada, mesmo que mais antigas', () => {
    const escolhido = escolherVersao([
      carro({ id: 1, yearFrom: 2024, enginePowerBhp: null }),
      carro({ id: 2, yearFrom: 2019, enginePowerBhp: 455 }),
    ]);
    expect(escolhido?.id).toBe(2);
  });

  it('na Ford, ignora versões de performance extrema e modelos parecidos', () => {
    const escolhido = versaoFord('Ranger', [
      carro({ id: 1, model: 'Ford Ranger Raptor', yearFrom: 2024, enginePowerBhp: 405 }),
      carro({ id: 2, model: 'Ford Ranger', yearFrom: 2023, enginePowerBhp: 270 }),
    ]);
    expect(escolhido?.id).toBe(2);
    expect(versaoFord('Mustang', [carro({ model: 'Ford Mustang Mach-E', yearFrom: 2021 })])).toBeNull();
    expect(versaoFord('Bronco Sport', [carro({ model: 'Bronco', yearFrom: 2021 })])).toBeNull();
  });

  it('no Ranger Raptor, escolhe a versão Raptor mesmo sendo de nicho, e ignora o Ranger de linha', () => {
    const escolhido = versaoFord('Ranger Raptor', [
      carro({ id: 1, model: 'Ford Ranger Raptor', yearFrom: 2024, enginePowerBhp: 405 }),
      carro({ id: 2, model: 'Ford Ranger', yearFrom: 2023, enginePowerBhp: 270 }),
    ]);
    expect(escolhido?.id).toBe(1);
  });

  it('no Maverick Hybrid, reconhece pela variante (a API nunca escreve "Hybrid" no model, só "FHEV" no variant)', () => {
    const escolhido = versaoFord('Maverick Hybrid', [
      carro({ id: 1, model: 'Ford Maverick', variant: '2.0L EcoBoost 8AT (250 HP)', yearFrom: 2022, enginePowerBhp: 247 }),
      carro({ id: 2, model: 'Ford Maverick', variant: '2.5L FHEV 8AT (191 HP)', yearFrom: 2022, enginePowerBhp: 160 }),
    ]);
    expect(escolhido?.id).toBe(2);
  });

  it('no rival, reconhece só o modelo certo pelo filtro', () => {
    const tucson = SEGMENTOS['Territory'].rivais.find((r) => r.rotulo === 'Tucson')!;
    const escolhido = versaoRival(tucson, [
      carro({ id: 1, make: 'HYUNDAI', model: 'Tucson', yearFrom: 2018, enginePowerBhp: 183 }),
      carro({ id: 2, make: 'HYUNDAI', model: 'Hyundai Tucson', yearFrom: 2024, enginePowerBhp: 187 }),
      carro({ id: 3, make: 'HYUNDAI', model: 'ix35 / Tucson', yearFrom: 2013, enginePowerBhp: 180 }),
    ]);
    expect(escolhido?.id).toBe(2);
  });

  it('compara cada modelo Ford só com o segmento dele', () => {
    // SUV não é comparado com esportivo, e picape não é comparada com SUV.
    const rotulos = (m: string) => SEGMENTOS[m].rivais.map((r) => r.rotulo);
    expect(rotulos('Bronco Sport')).toEqual(expect.arrayContaining(['HR-V', 'Kona']));
    expect(rotulos('Bronco Sport')).not.toContain('NSX');
    expect(rotulos('Mustang')).not.toContain('CR-V');
  });

  it('nenhum rival de SUV se repete entre Bronco Sport, Territory e Explorer — cada um no seu porte', () => {
    const rotulos = (m: string) => SEGMENTOS[m].rivais.map((r) => r.rotulo);
    const compacto = rotulos('Bronco Sport');
    const medio = rotulos('Territory');
    const grande = rotulos('Explorer');
    expect(compacto.filter((r) => medio.includes(r) || grande.includes(r))).toEqual([]);
    expect(medio.filter((r) => compacto.includes(r) || grande.includes(r))).toEqual([]);
    expect(grande.filter((r) => compacto.includes(r) || medio.includes(r))).toEqual([]);
  });

  it('cada picape leva a rival do porte mais parecido — só o F-150 (o único sem porte equivalente) leva as duas', () => {
    // Honda e Hyundai só têm duas picapes no catálogo inteiro (Ridgeline e Santa Cruz), então pra 4 modelos
    // Ford picape nem todo mundo sai sem repetir: Ranger e Ranger Raptor dividem a Ridgeline (mesmo porte),
    // e só o F-150 — que não tem equivalente de porte em nenhuma das duas — leva as duas.
    const rotulos = (m: string) => SEGMENTOS[m].rivais.map((r) => r.rotulo);
    expect(rotulos('Ranger')).toEqual(['Ridgeline']);
    expect(rotulos('Ranger Raptor')).toEqual(['Ridgeline']);
    expect(rotulos('Maverick Hybrid')).toEqual(['Santa Cruz']);
    expect(rotulos('F-150')).toEqual(['Ridgeline', 'Santa Cruz']);
    expect(SEGMENTOS['Ranger Raptor'].rotulo).toBe('Picape de performance');
  });

  it('monta a comparação com a Ford como referência e sem outros modelos Ford', () => {
    const comparacao = montarComparacao(
      'Ranger',
      [carro({ id: 1, model: 'Ford Ranger', yearFrom: 2024, enginePowerBhp: 315 })],
      {},
      // Ridgeline sem dados na API
    );
    expect(comparacao?.segmento).toBe('Picape');
    expect(comparacao?.itens.map((i) => `${i.marca} ${i.modelo}`)).toEqual(['Ford Ranger']);
    expect(comparacao?.itens[0].referencia).toBe(true);
    expect(comparacao?.semDados).toEqual(['Honda Ridgeline']);
  });

  it('monta a comparação também com o rival, quando a API devolve dados pra ele', () => {
    const rivais = SEGMENTOS['Maverick Hybrid'].rivais;
    const comparacao = montarComparacao(
      'Maverick Hybrid',
      [carro({ id: 1, model: 'Ford Maverick', variant: '2.5L FHEV 8AT (191 HP)', yearFrom: 2022, enginePowerBhp: 160 })],
      {
        [chaveRival(rivais[0])]: [carro({ id: 2, make: 'HYUNDAI', model: 'Hyundai Santa Cruz', yearFrom: 2023, enginePowerBhp: 191 })],
      },
    );
    expect(comparacao?.segmento).toBe('Picape compacta');
    expect(comparacao?.itens.map((i) => `${i.marca} ${i.modelo}`)).toEqual(['Ford Maverick Hybrid', 'Hyundai Santa Cruz']);
    expect(comparacao?.semDados).toEqual([]);
  });

  it('não monta comparação para modelo sem segmento cadastrado', () => {
    expect(montarComparacao('Fiesta', [], {})).toBeNull();
  });

  it('reconhece qual modelo Ford o texto da busca representa', () => {
    const linha = ['Mustang', 'Bronco Sport', 'F-150'];
    expect(modeloDaBusca('bronco sport', linha)).toBe('Bronco Sport');
    expect(modeloDaBusca('Ford F-150 Lightning', linha)).toBe('F-150');
    expect(modeloDaBusca('Civic', linha)).toBeNull();
  });
});
