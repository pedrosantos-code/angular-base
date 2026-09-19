/**
 * Foto de cada modelo para as páginas que não são /modelos (portal, landing…).
 * Ranger e F-150 Lightning usam cópias leves em /fotos: os originais têm 10 MB e 4 MB.
 */
const FOTOS: Record<string, string> = {
  'Territory': 'territory.jpeg',
  'Bronco Sport': 'bronco-sport.jpeg',
  'Explorer': 'explorer.jpeg',
  'Ranger': 'fotos/ranger-web.jpg',
  'Ranger Raptor': 'ranger-raptor.jpg',
  'Maverick Tremor': 'maverick-tremor.jpg',
  'Mustang GT': 'mustang.jpeg',
  'Mustang Mach-E': 'mach-e.jpg',
  'F-150': 'f150.jpg',
  'F-150 Lightning': 'fotos/f150-lightning-web.jpg',
};

/** Caminho da foto do modelo, ou null quando não há foto para ele. */
export function fotoDoModelo(nome: string): string | null {
  return FOTOS[nome] ?? null;
}
