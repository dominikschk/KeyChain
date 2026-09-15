#!/usr/bin/env node
/**
 * Ein Befehl für Dominik: prüft Node, legt Env an, startet lokalen Mock-Test.
 *   npm run bambu:go
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const envExample = path.join(__dirname, '.env.bambu.local.example');
const envLocal = path.join(__dirname, '.env.bambu.local');

function ban(msg) {
  console.log('\n' + '='.repeat(56));
  console.log(msg);
  console.log('='.repeat(56) + '\n');
}

ban('NUDAIM Bambu – Ein-Klick-Check');

if (!fs.existsSync(path.join(root, 'node_modules'))) {
  console.log('→ npm ci …');
  const r = spawnSync('npm', ['ci'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status || 1);
}

if (!fs.existsSync(envLocal) && fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, envLocal);
  console.log('→ .env.bambu.local angelegt (Dummy-Werte OK für Mock-Test)');
}

console.log('→ Mock-Flow starten (kein Drucker nötig) …\n');
const test = spawnSync('npm', ['run', 'test:bambu-local'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (test.status !== 0) {
  ban('❌ FEHLER – schick mir die Ausgabe oben');
  process.exit(test.status || 1);
}

ban('✅ SOFTWARE KLAPPT (Mock-Druck-Flow grün)');
console.log('Was das beweist:');
console.log('  QC-Dispatch → Adapter → Gateway-API → Slice → Print-Befehl');
console.log('');
console.log('NUR WENN du am echten Bambu drucken willst (5 Min):');
console.log('  1. Am Drucker: Developer Mode AN, IP + Access Code + Serial notieren');
console.log('  2. Datei öffnen: tools/bambu-bridge/.env.bambu.local');
console.log('     BAMBU_PRINTER_ID=<dein Serial>');
console.log('  3. Terminal:');
console.log('     docker compose -f tools/bambu-bridge/docker-compose.yml --env-file tools/bambu-bridge/.env.bambu.local up -d');
console.log('  4. Browser: http://localhost:4844/settings → Drucker speichern');
console.log('  5. Nochmal: npm run bambu:go');
console.log('');
console.log('Details: tools/bambu-bridge/DEIN_20_MIN.md');
console.log('');
