import { beforeEach, describe, expect, it } from 'vitest';
import { CHAVE_MODELO_RECOMENDADO, lerModeloRecomendado, salvarModeloRecomendado } from './modelo-recomendado';

describe('modelo recomendado (perfil → agendamentos)', () => {
  beforeEach(() => localStorage.clear());

  it('devolve null quando nada foi salvo', () => {
    expect(lerModeloRecomendado()).toBeNull();
  });

  it('guarda e devolve o carro em primeiro lugar', () => {
    salvarModeloRecomendado({ nome: 'Maverick Hybrid', segmento: 'Picape compacta', cobertura: 68 });
    expect(lerModeloRecomendado()).toEqual({ nome: 'Maverick Hybrid', segmento: 'Picape compacta', cobertura: 68 });
  });

  it('a cada salvamento vale o mais recente e a cobertura pode ser nula (sem orçamento)', () => {
    salvarModeloRecomendado({ nome: 'Territory', segmento: 'SUV médio', cobertura: 100 });
    salvarModeloRecomendado({ nome: 'Ranger', segmento: 'Picape média', cobertura: null });
    expect(lerModeloRecomendado()).toEqual({ nome: 'Ranger', segmento: 'Picape média', cobertura: null });
  });

  it('ignora dado corrompido ou sem nome', () => {
    localStorage.setItem(CHAVE_MODELO_RECOMENDADO, '{quebrado');
    expect(lerModeloRecomendado()).toBeNull();
    localStorage.setItem(CHAVE_MODELO_RECOMENDADO, JSON.stringify({ segmento: 'SUV' }));
    expect(lerModeloRecomendado()).toBeNull();
  });
});
