import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const out = new URL('./dist/', import.meta.url);
await mkdir(out, { recursive: true });
for (const file of ['index.html', 'style.css', 'manifest.webmanifest', 'icons']) {
  await cp(new URL(file, root), new URL(file, out), { recursive: true });
}
let script = await readFile(new URL('script.js', root), 'utf8');
script = script.replace(/const SHEET_CSV_URL = "[^"]+";/, 'const SHEET_CSV_URL = "/api/events.csv";');
script = script.replace('`${SHEET_CSV_URL}&_=${Date.now()}`', '`${SHEET_CSV_URL}?_=${Date.now()}`');
// Private activity data must never survive expiry/logout via localStorage.
script = script.replace('    localStorage.setItem("aarshjul-csv", csv);', '');
script = script.replace(/    const cachedCsv = localStorage.getItem\("aarshjul-csv"\);[\s\S]*?    console.error\(error\);/, '    console.error(error);');
script = 'localStorage.removeItem("aarshjul-csv");\n' + script;
script = script.replace('Kontrollér at fanen stadig er udgivet som CSV.', 'Kontrollér forbindelsen, eller åbn appen igen for at logge ind.');
await writeFile(new URL('script.js', out), script);
await cp(new URL('./service-worker.js', import.meta.url), new URL('service-worker.js', out));
await cp(new URL('./worker.mjs', import.meta.url), new URL('_worker.js', out));
await writeFile(new URL('_routes.json', out), JSON.stringify({ version: 1, include: ['/*'], exclude: [] }));
console.log('Cloudflare PWA built; GitHub Pages files unchanged.');
