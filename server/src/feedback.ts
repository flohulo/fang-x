// Sammelt anonyme Rückmeldungen zur Runde in einem einzelnen Durable Object (SQLite).
// Gespeichert werden nur Sterne, Freitext, Rolle und Zeitpunkt. Kein Spiel-Code, kein Name,
// keine IP-Adresse und keine Standorte.

import { DurableObject } from "cloudflare:workers";
import {
  FEEDBACK_MAX_RATING,
  FEEDBACK_MIN_RATING,
  parseFeedback,
  type FeedbackRole,
} from "@fang-x/shared";

/** Es gibt genau eine Instanz, die alle Rückmeldungen hält. */
export const FEEDBACK_OBJECT_NAME = "feedback";
const RECENT_LIMIT = 100;

export interface FeedbackEntry {
  rating: number;
  reason: string;
  role: FeedbackRole | null;
  createdAt: number;
}

export interface FeedbackSummary {
  total: number;
  average: number | null;
  /** Anzahl je Sternezahl, Index 0 = 1 Stern. */
  counts: number[];
  recent: FeedbackEntry[];
}

export class FeedbackStore extends DurableObject {
  constructor(state: DurableObjectState, env: Cloudflare.Env) {
    super(state, env);
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rating INTEGER NOT NULL,
        reason TEXT NOT NULL,
        role TEXT,
        created_at INTEGER NOT NULL
      )`,
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/add" && request.method === "POST") {
      const input = parseFeedback(await request.json().catch(() => null));
      if (!input) return Response.json({ error: "Ungültige Rückmeldung" }, { status: 400 });
      this.ctx.storage.sql.exec(
        "INSERT INTO feedback (rating, reason, role, created_at) VALUES (?, ?, ?, ?)",
        input.rating,
        input.reason,
        input.role,
        Date.now(),
      );
      return Response.json({ ok: true });
    }

    if (url.pathname === "/summary" && request.method === "GET") {
      return Response.json(this.summary());
    }

    return Response.json({ error: "Unbekannter Endpunkt" }, { status: 404 });
  }

  private summary(): FeedbackSummary {
    const sql = this.ctx.storage.sql;
    const counts = new Array<number>(FEEDBACK_MAX_RATING - FEEDBACK_MIN_RATING + 1).fill(0);
    for (const row of sql.exec("SELECT rating, COUNT(*) AS n FROM feedback GROUP BY rating")) {
      counts[Number(row.rating) - FEEDBACK_MIN_RATING] = Number(row.n);
    }
    const total = counts.reduce((sum, n) => sum + n, 0);
    const weighted = counts.reduce((sum, n, i) => sum + n * (i + FEEDBACK_MIN_RATING), 0);
    const recent = sql
      .exec(
        "SELECT rating, reason, role, created_at FROM feedback ORDER BY id DESC LIMIT ?",
        RECENT_LIMIT,
      )
      .toArray()
      .map((row) => ({
        rating: Number(row.rating),
        reason: String(row.reason),
        role: (row.role as FeedbackRole | null) ?? null,
        createdAt: Number(row.created_at),
      }));
    return { total, average: total > 0 ? weighted / total : null, counts, recent };
  }
}
