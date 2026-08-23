export async function ensureUser(db, guildId, userId) {
  await db.prepare(`INSERT OR IGNORE INTO users (guild_id, user_id) VALUES (?, ?)`)
    .bind(guildId, userId).run();
}

export async function getUserRow(db, guildId, userId) {
  await ensureUser(db, guildId, userId);
  return await db.prepare(`SELECT * FROM users WHERE guild_id = ? AND user_id = ?`)
    .bind(guildId, userId).first();
}

export async function addCoins(db, guildId, userId, delta) {
  await ensureUser(db, guildId, userId);
  await db.prepare(`UPDATE users SET coins = MAX(0, coins + ?) WHERE guild_id = ? AND user_id = ?`)
    .bind(delta, guildId, userId).run();
  return await getUserRow(db, guildId, userId);
}

export async function transferCoins(db, guildId, fromId, toId, amount) {
  const from = await getUserRow(db, guildId, fromId);
  await ensureUser(db, guildId, toId);
  if (from.coins < amount) return { ok: false, balance: from.coins };
  await db.batch([
    db.prepare(`UPDATE users SET coins = coins - ? WHERE guild_id = ? AND user_id = ?`).bind(amount, guildId, fromId),
    db.prepare(`UPDATE users SET coins = coins + ? WHERE guild_id = ? AND user_id = ?`).bind(amount, guildId, toId)
  ]);
  return { ok: true };
}

export async function topCoins(db, guildId, limit=10) {
  const r = await db.prepare(`SELECT user_id, coins FROM users WHERE guild_id=? ORDER BY coins DESC, user_id ASC LIMIT ?`)
    .bind(guildId, limit).all();
  return r.results ?? [];
}

export async function createSession(db, id, guildId, ownerId, kind, question=null) {
  await db.prepare(`INSERT INTO sessions (id,guild_id,owner_id,kind,question,status,created_at)
    VALUES (?,?,?,?,?,'open',?)`)
    .bind(id,guildId,ownerId,kind,question,new Date().toISOString()).run();
}

export async function addSessionMember(db,id,userId) {
  await db.prepare(`INSERT OR IGNORE INTO session_members (session_id,user_id) VALUES (?,?)`).bind(id,userId).run();
}
export async function removeSessionMember(db,id,userId) {
  await db.prepare(`DELETE FROM session_members WHERE session_id=? AND user_id=?`).bind(id,userId).run();
}
export async function sessionMembers(db,id) {
  const r = await db.prepare(`SELECT user_id FROM session_members WHERE session_id=? ORDER BY rowid ASC`).bind(id).all();
  return (r.results ?? []).map(x=>x.user_id);
}
export async function getSession(db,id) {
  return await db.prepare(`SELECT * FROM sessions WHERE id=?`).bind(id).first();
}
export async function closeSession(db,id) {
  await db.prepare(`UPDATE sessions SET status='closed' WHERE id=?`).bind(id).run();
}
export async function vote(db,id,userId,choice) {
  await db.prepare(`INSERT INTO poll_votes (session_id,user_id,choice) VALUES (?,?,?)
    ON CONFLICT(session_id,user_id) DO UPDATE SET choice=excluded.choice`).bind(id,userId,choice).run();
}
export async function pollCounts(db,id) {
  const r = await db.prepare(`SELECT choice, COUNT(*) c FROM poll_votes WHERE session_id=? GROUP BY choice`).bind(id).all();
  const out={yes:0,no:0};
  for (const row of r.results ?? []) out[row.choice]=Number(row.c);
  return out;
}

export async function shopItems(db) {
  const r = await db.prepare(`SELECT id,name,emoji,price,description FROM shop_items WHERE enabled=1 ORDER BY price ASC`).all();
  return r.results ?? [];
}
export async function shopItem(db,id) {
  return await db.prepare(`SELECT * FROM shop_items WHERE id=? AND enabled=1`).bind(id).first();
}
export async function buyItem(db,guildId,userId,item) {
  const u = await getUserRow(db,guildId,userId);
  if (u.coins < item.price) return {ok:false,balance:u.coins};
  await db.batch([
    db.prepare(`UPDATE users SET coins=coins-? WHERE guild_id=? AND user_id=?`).bind(item.price,guildId,userId),
    db.prepare(`INSERT INTO user_items (guild_id,user_id,item_id,quantity)
      VALUES (?,?,?,1)
      ON CONFLICT(guild_id,user_id,item_id) DO UPDATE SET quantity=quantity+1`)
      .bind(guildId,userId,item.id)
  ]);
  return {ok:true};
}
export async function inventory(db,guildId,userId) {
  const r = await db.prepare(`
    SELECT s.id,s.name,s.emoji,s.description,ui.quantity
    FROM user_items ui JOIN shop_items s ON s.id=ui.item_id
    WHERE ui.guild_id=? AND ui.user_id=? AND ui.quantity>0
    ORDER BY s.price ASC
  `).bind(guildId,userId).all();
  return r.results ?? [];
}

export async function grantAchievement(db,guildId,userId,achievementId) {
  await db.prepare(`INSERT OR IGNORE INTO user_achievements (guild_id,user_id,achievement_id,unlocked_at)
    VALUES (?,?,?,?)`).bind(guildId,userId,achievementId,new Date().toISOString()).run();
}
export async function achievements(db,guildId,userId) {
  const r = await db.prepare(`
    SELECT a.id,a.name,a.emoji,a.description,
           CASE WHEN ua.achievement_id IS NULL THEN 0 ELSE 1 END unlocked
    FROM achievements a
    LEFT JOIN user_achievements ua
      ON ua.achievement_id=a.id AND ua.guild_id=? AND ua.user_id=?
    ORDER BY a.id
  `).bind(guildId,userId).all();
  return r.results ?? [];
}

export async function addWarning(db,guildId,userId,adminId,reason) {
  await db.prepare(`INSERT INTO warnings (guild_id,user_id,admin_id,reason,created_at)
    VALUES (?,?,?,?,?)`).bind(guildId,userId,adminId,reason,new Date().toISOString()).run();
}
export async function warningsFor(db,guildId,userId) {
  const r = await db.prepare(`SELECT id,admin_id,reason,created_at FROM warnings
    WHERE guild_id=? AND user_id=? ORDER BY id DESC LIMIT 10`).bind(guildId,userId).all();
  return r.results ?? [];
}