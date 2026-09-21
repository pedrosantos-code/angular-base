import { describe, expect, it } from 'vitest';
import { fotoDoModelo } from './fotos-modelos';

describe('fotoDoModelo', () => {
  it('devolve a foto de modelos conhecidos', () => {
    expect(fotoDoModelo('Territory')).toBe('territory.jpeg');
    expect(fotoDoModelo('Mustang Mach-E')).toBe('mach-e.jpg');
  });

  it('tem foto para todos os modelos do ranking do perfil', () => {
    for (const nome of ['Maverick Hybrid', 'Transit Furgão', 'Transit Minibus']) {
      expect(fotoDoModelo(nome), nome).not.toBeNull();
    }
  });

  it('devolve null para modelo sem foto', () => {
    expect(fotoDoModelo('Modelo Inexistente')).toBeNull();
    expect(fotoDoModelo('')).toBeNull();
  });

});
