import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const themes = [
  ['@neoverse-ui/giscus-theme/light.css', 'giscus-light.css'],
  ['@neoverse-ui/giscus-theme/dark.css', 'giscus-dark.css'],
] as const;

await mkdir(publicDirectory, { recursive: true });

await Promise.all(
  themes.map(async ([specifier, fileName]) => {
    const source = fileURLToPath(import.meta.resolve(specifier));
    await copyFile(source, join(publicDirectory, fileName));
  }),
);

console.log(`Synced ${themes.length} Neoverse UI public asset(s).`);
