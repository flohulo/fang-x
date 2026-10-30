// Prüft die Übersetzungsdateien unter client/src/locales/.
//  - de.json ist die Quelle, en.json ist der Rückfall und muss vollständig sein.
//  - Andere Sprachen dürfen unvollständig sein (Weblate füllt sie nach), aber keine
//    unbekannten Schlüssel enthalten und keine Platzhalter ({{name}}, <1>…</1>) verändern.
// Aufruf: node scripts/check-locales.mjs

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = new URL("../client/src/locales/", import.meta.url).pathname;
const SOURCE = "de";
const FALLBACK = "en";
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

let errors = 0;
let warnings = 0;
const fail = (message) => {
  console.error(`✗ ${message}`);
  errors++;
};
const warn = (message) => {
  console.warn(`! ${message}`);
  warnings++;
};

function flatten(value, prefix = "", out = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object") flatten(child, path, out);
    else out.set(path, String(child));
  }
  return out;
}

const baseKey = (key) => key.replace(PLURAL_SUFFIX, "");
const placeholders = (text) =>
  new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}|<\/?(\w+)>/g)].map((m) => m[1] ?? `<${m[2]}>`));

const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
const locales = new Map();
for (const file of files) {
  const code = file.replace(/\.json$/, "");
  try {
    locales.set(code, flatten(JSON.parse(readFileSync(join(dir, file), "utf8"))));
  } catch (error) {
    fail(`${file}: kein gültiges JSON (${error.message})`);
  }
}

const source = locales.get(SOURCE);
if (!source) {
  fail(`${SOURCE}.json (Quellsprache) fehlt`);
  process.exit(1);
}
const sourceBases = new Map();
for (const [key, text] of source) {
  const base = baseKey(key);
  sourceBases.set(base, new Set([...(sourceBases.get(base) ?? []), ...placeholders(text)]));
}

for (const [code, entries] of locales) {
  if (code === SOURCE) continue;
  const bases = new Set();
  for (const [key, text] of entries) {
    const base = baseKey(key);
    bases.add(base);
    const allowed = sourceBases.get(base);
    if (!allowed) {
      fail(`${code}: unbekannter Schlüssel "${key}"`);
      continue;
    }
    if (text.trim() === "") continue; // leere Texte fallen auf die Fallback-Sprache zurück
    for (const token of placeholders(text)) {
      if (!allowed.has(token)) fail(`${code}: "${key}" enthält unbekannten Platzhalter ${token}`);
    }
    for (const token of allowed) {
      // "count" darf in Pluralformen wie "eine Haltestelle" fehlen.
      if (token === "count") continue;
      if (!placeholders(text).has(token)) {
        const message = `${code}: "${key}" lässt den Platzhalter ${token} aus`;
        code === FALLBACK ? fail(message) : warn(message);
      }
    }
  }
  const missing = [...sourceBases.keys()].filter((base) => !bases.has(base));
  if (missing.length > 0) {
    const message = `${code}: ${missing.length} von ${sourceBases.size} Schlüsseln fehlen (z. B. ${missing[0]})`;
    code === FALLBACK ? fail(message) : warn(message);
  }
}

if (!locales.has(FALLBACK)) fail(`${FALLBACK}.json (Rückfallsprache) fehlt`);

console.log(
  `${locales.size} Sprachen geprüft (${[...locales.keys()].join(", ")}): ${errors} Fehler, ${warnings} Hinweise`,
);
process.exit(errors > 0 ? 1 : 0);
