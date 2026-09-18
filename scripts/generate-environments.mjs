// Gera src/environments/environment.ts e environment.development.ts.
//
// Esses arquivos estao no .gitignore (contem as chaves do Supabase), entao em
// um clone novo do repositorio ou no build da Netlify eles nao existem e o
// `ng serve` / `ng build` falha. Este script roda no postinstall e antes do
// build, criando os arquivos a partir das variaveis de ambiente
// SUPABASE_URL e SUPABASE_KEY.
//
// Se o arquivo ja existe e nao ha variaveis de ambiente definidas, ele e
// mantido como esta (para nao sobrescrever as chaves locais de quem desenvolve).

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'environments');

// Valores de reserva: mantem o createClient() do Supabase valido para a pagina
// carregar mesmo sem credenciais. Apenas login/cadastro nao funcionam.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();
const fromEnv = Boolean(supabaseUrl && supabaseKey);

const targets = [
  { file: 'environment.ts', production: true },
  { file: 'environment.development.ts', production: false },
];

mkdirSync(dir, { recursive: true });

for (const { file, production } of targets) {
  const path = join(dir, file);

  if (existsSync(path) && !fromEnv) {
    console.log(`[environments] ${file} ja existe, mantido`);
    continue;
  }

  writeFileSync(
    path,
    `// Arquivo gerado por scripts/generate-environments.mjs. Nao versionado.
export const environment = {
  production: ${production},
  supabaseUrl: '${supabaseUrl || PLACEHOLDER_URL}',
  supabaseKey: '${supabaseKey || PLACEHOLDER_KEY}',
};
`,
  );

  console.log(
    `[environments] ${file} gerado ${fromEnv ? 'a partir das variaveis de ambiente' : 'com valores de reserva'}`,
  );
}

if (!fromEnv) {
  console.log(
    '[environments] Defina SUPABASE_URL e SUPABASE_KEY para habilitar login e cadastro.',
  );
}
