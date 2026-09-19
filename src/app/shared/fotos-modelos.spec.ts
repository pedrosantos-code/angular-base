import { describe, expect, it } from 'vitest';
import { fotoDoModelo } from './fotos-modelos';

describe('fotoDoModelo', () => {
  it('devolve a foto de modelos conhecidos', () => {
    expect(fotoDoModelo('Territory')).toBe('territory.jpeg');
    expect(fotoDoModelo('Mustang Mach-E')).toBe('mach-e.jpg');
  });

  it('devolve null para modelo sem foto', () => {
    expect(fotoDoModelo('Transit Furgão')).toBeNull();
    expect(fotoDoModelo('')).toBeNull();
  });

});
