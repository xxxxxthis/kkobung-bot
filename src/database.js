export async function ensureUser(db, guildId, userId) {
  await db.prepare(`
    INSERT OR IGNORE INTO users (guild_id, user_id)
    VALUES (?, ?)
  `).bind(guildId, userId).run();
}

export async function getUserRow(db, guildId, userId) {
  await ensureUser(db, guildId, userId);
  return await db.prepare(`
    SELECT * FROM users WHERE guild_id = ? AND user_id = ?
  `).bind(guildId, userId).first();
}

export async function addCoins(db, guildId, userId, delta) {
  await ensureUser(db, guildId, userId);
  await db.prepare(`
    UPDATE users SET coins = MAX(0, coins + ?)
    WHERE guild_id = ? AND user_id = ?
  `).bind(delta, guildId, userId).run();
  return await getUserRow(db, guildId, userId);
}

export async function transferCoins(db, guildId, fromId, toId, amount) {
  await ensureUser(db, guildId, fromId);
  await ensureUser(db, guildId, toId);
  const from = await getUserRow(db, guildId, fromId);
  if (from.coins < amount) return { ok: false, reason: "balance", balance: from.coins };

  await db.batch([
    db.prepare(`UPDATE users SET coins = coins - ? WHERE guild_id = ? AND user_id = ?`)
      .bind(amount, guildId, fromId),
    db.prepare(`UPDATE users SET coins = coins + ? WHERE guild_id = ? AND user_id = ?`)
      .bind(amount, guildId, toId)
  ]);
  return { ok: true };
}

export async function topCoins(db, guildId, limit = 10) {
  const r = await db.prepare(`
    SELECT user_id, coins FROM users
    WHERE guild_id = ?
    ORDER BY coins DESC, user_id ASC
    LIMIT ?
  `).bind(guildId, limit).all();
  return r.results ?? [];
}

export async function createSession(db, id, guildId, ownerId, kind, question = null) {
  await db.prepare(`
    INSERT INTO sessions (id, guild_id, owner_id, kind, question, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?)
  `).bind(id, guildId, ownerId, kind, question, new Date().toISOString()).run();
}

export async function addSessionMember(db, sessionId, userId) {
  await db.prepare(`
    INSERT OR IGNORE INTO session_members (session_id, user_id)
    VALUES (?, ?)
  `).bind(sessionId, userId).run();
}

export async function removeSessionMember(db, sessionId, userId) {
  await db.prepare(`
    DELETE FROM session_members WHERE session_id = ? AND user_id = ?
  `).bind(sessionId, userId).run();
}

export async function sessionMembers(db, sessionId) {
  const r = await db.prepare(`
    SELECT user_id FROM session_members
    WHERE session_id = ?
    ORDER BY rowid ASC
  `).bind(sessionId).all();
  return (r.results ?? []).map(x => x.user_id);
}

export async function getSession(db, sessionId) {
  return await db.prepare(`SELECT * FROM sessions WHERE id = ?`).bind(sessionId).first();
}

export async function closeSession(db, sessionId) {
  await db.prepare(`UPDATE sessions SET status = 'closed' WHERE id = ?`).bind(sessionId).run();
}

export async function vote(db, sessionId, userId, choice) {
  await db.prepare(`
    INSERT INTO poll_votes (session_id, user_id, choice)
    VALUES (?, ?, ?)
    ON CONFLICT(session_id, user_id)
    DO UPDATE SET choice = excluded.choice
  `).bind(sessionId, userId, choice).run();
}

export async function pollCounts(db, sessionId) {
  const r = await db.prepare(`
    SELECT choice, COUNT(*) AS c FROM poll_votes
    WHERE session_id = ?
    GROUP BY choice
  `).bind(sessionId).all();
  const out = { yes: 0, no: 0 };
  for (const row of r.results ?? []) out[row.choice] = Number(row.c);
  return out;
}