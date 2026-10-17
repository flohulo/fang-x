# Fang X — Preview starten

Monorepo (npm workspaces): `shared/`, `server/`, `client/`.
`wrangler dev` liefert **einen** Origin: die HTTP-API (`POST /api/games`), die
WebSocket-Route (`/room/:code`, Durable Object `GameRoom`) und die gebauten
Client-Assets aus `client/dist` (ASSETS-Binding, SPA-Fallback). Deshalb nutzt der
Client `location.host` — es gibt keinen Vite-Proxy und kein CORS.

## 1. Artefakte reproduzieren

```bash
npm ci                    # Lockfile-basiert; node_modules/@fang-x/shared wird verlinkt
npm run build             # baut client/dist inkl. Service Worker + Manifest
```

`client/dist` ist eingecheckt-ignoriert (`.gitignore`), muss also nach dem
Auschecken neu gebaut werden. Keine Secrets nötig, alle Konfiguration steckt in
`client/vite.config.ts` und `server/wrangler.toml`.

Optional: `.env.example` → `.env.local` kopieren und `VITE_LEGAL_*` setzen, dann
erscheinen Impressum/Datenschutz mit echten Betreiberangaben. Vite liest die Datei
beim **Build** (nicht im laufenden Server) — nach Änderung `npm run build` erneut
ausführen.

## 2. Server starten (Port 3000)

```bash
bash .freebuff/start-preview.sh
```

Das Skript startet detached (`setsid nohup`), schreibt die PID nach
`.freebuff/preview.pid` und das Log nach `.freebuff/preview.log`:

```bash
./node_modules/.bin/wrangler dev --ip 0.0.0.0 --port 3000   # cwd: server/
```

Wichtig: `--ip 0.0.0.0` (Vorschau-Host erreicht den Port sonst nicht), und aus
`server/` starten, damit `wrangler.toml` (Assets-Pfad `../client/dist`) gefunden
wird.

## 3. Prüfen

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: <preview-host>' http://127.0.0.1:3000/
curl -s -X POST -H 'Host: <preview-host>' http://127.0.0.1:3000/api/games
node /tmp/wscheck.mjs   # oder: WebSocket-Upgrade auf /room/:code → HTTP 101 + "joined"
```

## 4. Integrationstest (voller Spielablauf)

`scripts/integration-test.mjs` läuft gegen `ws://localhost:8787`. Dafür den
Server zusätzlich/alternativ auf 8787 starten:

```bash
cd server && ../node_modules/.bin/wrangler dev --port 8787 &
cd .. && npm run test:integration    # 18/18 (Spielablauf, Reconnect, unbekannter Code)
```

## Stoppen

```bash
kill "$(cat .freebuff/preview.pid)"
```
