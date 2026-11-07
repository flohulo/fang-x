// Holt die Mitwirkenden des Repositories von GitHub und schreibt sie nach
// client/src/contributors.json. Die Liste wird mit der App ausgeliefert, der Browser
// fragt GitHub also nie selbst ab.
// Aufruf: node scripts/update-contributors.mjs   (optional GITHUB_TOKEN gegen Rate-Limits)

import { writeFileSync } from "node:fs";

const REPO = "flohulo/fang-x";
const target = new URL("../client/src/contributors.json", import.meta.url);

const headers = { Accept: "application/vnd.github+json", "User-Agent": "fang-x-contributors" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const contributors = [];
for (let page = 1; ; page++) {
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/contributors?per_page=100&page=${page}`,
    { headers },
  );
  if (!response.ok) {
    console.error(`GitHub antwortete mit ${response.status} ${response.statusText}.`);
    process.exit(1);
  }
  const batch = await response.json();
  for (const user of batch) {
    if (user.type !== "User") continue; // Bots auslassen
    contributors.push({ login: user.login, url: user.html_url, contributions: user.contributions });
  }
  if (batch.length < 100) break;
}

writeFileSync(target, `${JSON.stringify(contributors, null, 2)}\n`);
console.log(`${contributors.length} Mitwirkende nach client/src/contributors.json geschrieben.`);
