/* ============================================================
   Mayor de Stock — API (Cloudflare Worker + D1)
   ------------------------------------------------------------
   Guarda el estado completo de la app como un documento JSON,
   por "space" (para tener varios inventarios en el mismo Worker).
   Control de concurrencia optimista con "rev":
     - El cliente manda baseRev (la rev que tenía).
     - Si coincide con la del servidor, se acepta y rev++.
     - Si no, 409 (conflicto) con el estado actual del servidor.
   Auth: header  Authorization: Bearer <TOKEN>   (env.TOKEN, secret)
   ============================================================ */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400"
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    // --- Auth ---
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!env.TOKEN || token !== env.TOKEN) {
      return json({ error: "no autorizado" }, 401);
    }

    const url = new URL(req.url);
    if (url.pathname.replace(/\/+$/, "") !== "/state") {
      return json({ error: "ruta no encontrada" }, 404);
    }
    const space = (url.searchParams.get("space") || "main").slice(0, 64);

    // --- Asegurar tabla (idempotente) ---
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS estado (
         space TEXT PRIMARY KEY,
         data TEXT,
         rev INTEGER NOT NULL DEFAULT 0,
         updated_at TEXT
       )`
    ).run();

    // --- GET: leer estado ---
    if (req.method === "GET") {
      const row = await env.DB.prepare(
        "SELECT data, rev, updated_at FROM estado WHERE space = ?"
      ).bind(space).first();
      if (!row) return json({ data: null, rev: 0, updated_at: null });
      return json({ data: JSON.parse(row.data), rev: row.rev, updated_at: row.updated_at });
    }

    // --- PUT: guardar estado (con control de rev) ---
    if (req.method === "PUT") {
      let body;
      try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
      if (!body || typeof body.data !== "object") {
        return json({ error: "falta 'data'" }, 400);
      }
      const baseRev = Number(body.baseRev || 0);
      const force = !!body.force;

      const cur = await env.DB.prepare(
        "SELECT data, rev, updated_at FROM estado WHERE space = ?"
      ).bind(space).first();
      const currentRev = cur ? cur.rev : 0;

      if (!force && baseRev !== currentRev) {
        // conflicto: devuelvo el estado del servidor para que el cliente resuelva
        return json({
          conflict: true,
          rev: currentRev,
          data: cur ? JSON.parse(cur.data) : null,
          updated_at: cur ? cur.updated_at : null
        }, 409);
      }

      const newRev = currentRev + 1;
      const now = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO estado (space, data, rev, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(space) DO UPDATE SET
           data = excluded.data,
           rev = excluded.rev,
           updated_at = excluded.updated_at`
      ).bind(space, JSON.stringify(body.data), newRev, now).run();

      return json({ ok: true, rev: newRev, updated_at: now });
    }

    return json({ error: "método no soportado" }, 405);
  }
};
