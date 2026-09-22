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

  it('no rival, reconhece só o modelo certo pelo filtro', () => {
    const tucson = SEGMENTOS['Bronco Sport'].rivais.find((r) => r.rotulo === 'Tucson')!;
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
    expect(rotulos('Bronco Sport')).toEqual(expect.arrayContaining(['CR-V', 'Tucson']));
    expect(rotulos('Bronco Sport')).not.toContain('NSX');
    expect(rotulos('Mustang')).not.toContain('CR-V');
    expect(rotulos('Ranger')).toEqual(['Ridgeline', 'Santa Cruz']);
    expect(SEGMENTOS['Ranger']).toBe(SEGMENTOS['F-150']);
    expect(rotulos('Ranger Raptor')).toEqual(['Ridgeline', 'Santa Cruz']);
    expect(SEGMENTOS['Ranger Raptor'].rotulo).toBe('Picape de performance');
  });

  it('monta a comparação com a Ford como referência e sem outros modelos Ford', () => {
    const rivais = SEGMENTOS['Ranger'].rivais;
    const comparacao = montarComparacao(
      'Ranger',
      [carro({ id: 1, model: 'Ford Ranger', yearFrom: 2024, enginePowerBhp: 315 })],
      {
        [chaveRival(rivais[0])]: [carro({ id: 2, make: 'HONDA', model: 'Honda Ridgeline', yearFrom: 2017, enginePowerBhp: 280 })],
        // Santa Cruz sem dados na API
      },
    );
    expect(comparacao?.segmento).toBe('Picape');
    expect(comparacao?.itens.map((i) => `${i.marca} ${i.modelo}`)).toEqual(['Ford Ranger', 'Honda Ridgeline']);
    expect(comparacao?.itens[0].referencia).toBe(true);
    expect(comparacao?.itens[1].referencia).toBe(false);
    expect(comparacao?.semDados).toEqual(['Hyundai Santa Cruz']);
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
