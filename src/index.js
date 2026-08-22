import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";

import { COMMANDS } from "./commands.js";
import {
  commandReply, updateReply, getOption, getUser, displayName,
  randomInt, deterministicPercent, shuffle, todayKST, fortuneFor, json
} from "./utils.js";

import {
  ensureUser, getUserRow, addCoins, transferCoins, topCoins,
  createSession, addSessionMember, removeSessionMember,
  sessionMembers, getSession, closeSession, vote, pollCounts
} from "./database.js";

const BTN = { PRIMARY: 1, SECONDARY: 2, SUCCESS: 3, DANGER: 4 };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("꼬붕봇 v1 살아있음 🤖");
    }

    if (url.pathname === "/register") {
      if (request.method !== "POST") return new Response("POST only", { status: 405 });
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${env.SETUP_SECRET}`) return new Response("Unauthorized", { status: 401 });

      const endpoint = `https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.DISCORD_GUILD_ID}/commands`;
      const r = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Authorization": `Bot ${env.DISCORD_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(COMMANDS)
      });

      return new Response(await r.text(), {
        status: r.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname !== "/discord") return new Response("Not Found", { status: 404 });
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const sig = request.headers.get("X-Signature-Ed25519");
    const ts = request.headers.get("X-Signature-Timestamp");
    const raw = await request.clone().arrayBuffer();

    if (!sig || !ts || !env.DISCORD_PUBLIC_KEY) return new Response("Missing verification data", { status: 401 });

    const valid = await verifyKey(raw, sig, ts, env.DISCORD_PUBLIC_KEY.trim());
    if (!valid) return new Response("Bad signature", { status: 401 });

    const interaction = await request.json();

    if (interaction.type === InteractionType.PING) {
      return json({ type: InteractionResponseType.PONG });
    }

    if (!env.DB) return commandReply("❌ D1 binding `DB`가 없음. Cloudflare Bindings 확인해줘.", true);

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      try {
        return await handleCommand(interaction, env);
      } catch (e) {
        console.error(e);
        return commandReply(`❌ 오류 발생: ${e?.message ?? String(e)}`, true);
      }
    }

    if (interaction.type === 3) {
      try {
        return await handleComponent(interaction, env);
      } catch (e) {
        console.error(e);
        return commandReply(`❌ 버튼 처리 오류: ${e?.message ?? String(e)}`, true);
      }
    }

    return commandReply("아직 지원하지 않는 Interaction임 ㅋㅋ", true);
  }
};

async function handleCommand(i, env) {
  const c = i.data.name;
  const guildId = i.guild_id;
  const userId = i.member?.user?.id ?? i.user?.id;
  const name = displayName(i);
  await ensureUser(env.DB, guildId, userId);

  if (c === "핑") return commandReply("🏓 **퐁!** 꼬붕봇 정상 작동 중 🤖");

  if (c === "출석") {
    const today = todayKST();
    const u = await getUserRow(env.DB, guildId, userId);
    if (u.last_attendance === today) return commandReply("이미 오늘 출석했음 ㅋㅋ 내일 다시 와.", true);

    await env.DB.prepare(`
      UPDATE users
      SET coins = coins + 100,
          attendance_count = attendance_count + 1,
          last_attendance = ?
      WHERE guild_id = ? AND user_id = ?
    `).bind(today, guildId, userId).run();

    const updated = await getUserRow(env.DB, guildId, userId);
    return commandReply(`✅ **출석 완료**\n💰 +100 꼬붕코인\n📅 총 출석: **${updated.attendance_count}회**\n💵 잔액: **${Number(updated.coins).toLocaleString()}**`);
  }

  if (c === "잔액") {
    const targetId = getOption(i, "유저") ?? userId;
    const target = getUser(i, targetId);
    const u = await getUserRow(env.DB, guildId, targetId);
    const targetName = target?.global_name ?? target?.username ?? (targetId === userId ? name : "유저");
    return commandReply(`💰 **${targetName}의 지갑**\n**${Number(u.coins).toLocaleString()} 꼬붕코인**`);
  }

  if (c === "송금") {
    const targetId = getOption(i, "유저");
    const amount = Number(getOption(i, "금액"));
    if (targetId === userId) return commandReply("자기 자신한테 송금은 안 됨 ㅋㅋ", true);
    if (amount <= 0) return commandReply("금액이 이상함.", true);

    const r = await transferCoins(env.DB, guildId, userId, targetId, amount);
    if (!r.ok) return commandReply(`💸 코인 부족. 현재 **${Number(r.balance).toLocaleString()}**`, true);
    return commandReply(`💸 <@${targetId}>에게 **${amount.toLocaleString()} 꼬붕코인** 송금 완료.`);
  }

  if (c === "랭킹") {
    const rows = await topCoins(env.DB, guildId, 10);
    if (!rows.length) return commandReply("아직 랭킹 데이터 없음.");
    const medals = ["🥇","🥈","🥉"];
    const lines = rows.map((r, idx) => `${medals[idx] ?? `**${idx+1}.**`} <@${r.user_id}> — **${Number(r.coins).toLocaleString()}**`).join("\n");
    return commandReply(`🏆 **꼬붕코인 TOP 10**\n\n${lines}`);
  }

  if (c === "코인플립") {
    const amount = Number(getOption(i, "금액"));
    const choice = getOption(i, "선택");
    const u = await getUserRow(env.DB, guildId, userId);
    if (amount > u.coins) return commandReply(`💸 코인 부족. 현재 **${Number(u.coins).toLocaleString()}**`, true);

    const result = randomInt(0,1) ? "front" : "back";
    const win = result === choice;
    const updated = await addCoins(env.DB, guildId, userId, win ? amount : -amount);
    return commandReply(`🪙 **${result === "front" ? "앞" : "뒤"}!**\n${win ? "🎉 승리!" : "💀 패배"}\n${win ? "+" : "-"}${amount.toLocaleString()} 코인\n💵 잔액: **${Number(updated.coins).toLocaleString()}**`);
  }

  if (c === "슬롯") {
    const amount = Number(getOption(i, "금액"));
    const u = await getUserRow(env.DB, guildId, userId);
    if (amount > u.coins) return commandReply(`💸 코인 부족. 현재 **${Number(u.coins).toLocaleString()}**`, true);

    const icons = ["🍒","🍋","🍇","🔔","7️⃣"];
    const a = icons[randomInt(0, icons.length-1)];
    const b = icons[randomInt(0, icons.length-1)];
    const d = icons[randomInt(0, icons.length-1)];

    let delta = -amount;
    let text = "💀 꽝";
    if (a === b && b === d) { delta = amount * 4; text = "🎰 JACKPOT!"; }
    else if (a === b || b === d || a === d) { delta = amount; text = "✨ 2개 일치!"; }

    const updated = await addCoins(env.DB, guildId, userId, delta);
    return commandReply(`🎰 **SLOT**\n\n${a} | ${b} | ${d}\n\n${text}\n${delta >= 0 ? "+" : ""}${delta.toLocaleString()} 코인\n💵 잔액: **${Number(updated.coins).toLocaleString()}**`);
  }

  if (c === "주사위") return commandReply(`🎲 **${name}** → **${randomInt(1,100)}**`);

  if (c === "골라줘") {
    const choices = String(getOption(i, "선택지")).split(/[,/|]/).map(x=>x.trim()).filter(Boolean);
    if (choices.length < 2) return commandReply("선택지를 2개 이상 넣어줘. 예: `치킨,피자,햄버거`", true);
    return commandReply(`🎯 **꼬붕봇의 선택**\n👉 **${choices[randomInt(0,choices.length-1)]}**`);
  }

  if (c === "운세") return commandReply(`🔮 **${name}의 오늘의 운세**\n\n${fortuneFor(userId)}`);

  if (c === "전투력") {
    const power = randomInt(1, 999999);
    const rank = power >= 900000 ? "SSS" : power >= 700000 ? "S" : power >= 500000 ? "A" : power >= 300000 ? "B" : power >= 100000 ? "C" : power >= 30000 ? "D" : "F";
    return commandReply(`⚔️ **전투력 측정**\n👤 ${name}\n💥 **${power.toLocaleString()}**\n🏆 등급 **${rank}**`);
  }

  if (c === "궁합") {
    const targetId = getOption(i, "상대");
    const target = getUser(i, targetId);
    const targetName = target?.global_name ?? target?.username ?? "상대";
    const score = deterministicPercent(userId, targetId);
    const txt = score >= 90 ? "🔥 운명급" : score >= 70 ? "😏 꽤 좋음" : score >= 50 ? "🤝 무난함" : score >= 30 ? "🤨 애매함" : "💀 서로 멀리 있으십시오.";
    return commandReply(`💘 **궁합 테스트**\n${name} × ${targetName}\n❤️ **${score}%**\n${txt}`);
  }

  if (c === "팀짜기") {
    const members = String(getOption(i, "멤버")).split(/[,/|]/).map(x=>x.trim()).filter(Boolean);
    if (members.length < 2) return commandReply("2명 이상 넣어줘.", true);
    const mixed = shuffle(members);
    const mid = Math.ceil(mixed.length / 2);
    return commandReply(`⚔️ **랜덤 팀 배정**\n\n🔵 **TEAM A**\n${mixed.slice(0,mid).map(x=>`• ${x}`).join("\n")}\n\n🔴 **TEAM B**\n${mixed.slice(mid).map(x=>`• ${x}`).join("\n") || "• 없음"}`);
  }

  if (c === "내전") {
    const id = crypto.randomUUID().slice(0,8);
    await createSession(env.DB, id, guildId, userId, "scrim");
    await addSessionMember(env.DB, id, userId);
    const components = [{
      type: 1,
      components: [
        { type: 2, style: BTN.SUCCESS, label: "참가", custom_id: `scrim:join:${id}` },
        { type: 2, style: BTN.SECONDARY, label: "취소", custom_id: `scrim:leave:${id}` },
        { type: 2, style: BTN.PRIMARY, label: "팀 짜기", custom_id: `scrim:teams:${id}` },
        { type: 2, style: BTN.DANGER, label: "마감", custom_id: `scrim:close:${id}` }
      ]
    }];
    return commandReply(`🎮 **내전 모집**\n주최: <@${userId}>\n\n현재 참가자\n• <@${userId}>`, false, components);
  }

  if (c === "투표") {
    const q = String(getOption(i, "질문"));
    const id = crypto.randomUUID().slice(0,8);
    await createSession(env.DB, id, guildId, userId, "poll", q);
    const components = [{
      type: 1,
      components: [
        { type: 2, style: BTN.SUCCESS, label: "찬성", custom_id: `poll:yes:${id}` },
        { type: 2, style: BTN.DANGER, label: "반대", custom_id: `poll:no:${id}` }
      ]
    }];
    return commandReply(`🗳️ **투표**\n${q}\n\n✅ 찬성 **0** · ❌ 반대 **0**`, false, components);
  }

  if (c === "프로필") {
    const targetId = getOption(i, "유저") ?? userId;
    const target = getUser(i, targetId);
    const u = await getUserRow(env.DB, guildId, targetId);
    const targetName = target?.global_name ?? target?.username ?? (targetId === userId ? name : "유저");
    return commandReply(`👤 **${targetName}**\n💰 코인 **${Number(u.coins).toLocaleString()}**\n🔥 출석 **${u.attendance_count}회**\n⚔️ 승리 **${u.wins}**\n💀 패배 **${u.losses}**\n⭐ MVP **${u.mvp}회**`);
  }

  return commandReply("아직 구현 안 된 명령어임 ㅋㅋ", true);
}

async function handleComponent(i, env) {
  const [kind, action, id] = String(i.data.custom_id).split(":");
  const userId = i.member?.user?.id ?? i.user?.id;
  const session = await getSession(env.DB, id);

  if (!session || session.status !== "open") return commandReply("이미 끝난 세션이거나 찾을 수 없음.", true);

  if (kind === "scrim") {
    if (action === "join") await addSessionMember(env.DB, id, userId);
    if (action === "leave") await removeSessionMember(env.DB, id, userId);

    if (action === "close") {
      if (userId !== session.owner_id) return commandReply("주최자만 마감 가능.", true);
      await closeSession(env.DB, id);
      const m = await sessionMembers(env.DB, id);
      return updateReply(`🔒 **내전 모집 마감**\n참가자 ${m.length}명\n${m.map(x=>`• <@${x}>`).join("\n")}`, []);
    }

    const m = await sessionMembers(env.DB, id);

    if (action === "teams") {
      if (userId !== session.owner_id) return commandReply("주최자만 팀 짜기 가능.", true);
      if (m.length < 2) return commandReply("참가자가 2명 이상 필요함.", true);
      const mixed = shuffle(m);
      const mid = Math.ceil(mixed.length / 2);
      const components = [{
        type: 1,
        components: [
          { type: 2, style: BTN.SUCCESS, label: "참가", custom_id: `scrim:join:${id}` },
          { type: 2, style: BTN.SECONDARY, label: "취소", custom_id: `scrim:leave:${id}` },
          { type: 2, style: BTN.PRIMARY, label: "다시 섞기", custom_id: `scrim:teams:${id}` },
          { type: 2, style: BTN.DANGER, label: "마감", custom_id: `scrim:close:${id}` }
        ]
      }];
      return updateReply(`⚔️ **내전 팀 배정**\n\n🔵 **TEAM A**\n${mixed.slice(0,mid).map(x=>`• <@${x}>`).join("\n")}\n\n🔴 **TEAM B**\n${mixed.slice(mid).map(x=>`• <@${x}>`).join("\n")}`, components);
    }

    const components = [{
      type: 1,
      components: [
        { type: 2, style: BTN.SUCCESS, label: "참가", custom_id: `scrim:join:${id}` },
        { type: 2, style: BTN.SECONDARY, label: "취소", custom_id: `scrim:leave:${id}` },
        { type: 2, style: BTN.PRIMARY, label: "팀 짜기", custom_id: `scrim:teams:${id}` },
        { type: 2, style: BTN.DANGER, label: "마감", custom_id: `scrim:close:${id}` }
      ]
    }];
    return updateReply(`🎮 **내전 모집**\n주최: <@${session.owner_id}>\n\n현재 참가자 (${m.length})\n${m.map(x=>`• <@${x}>`).join("\n") || "없음"}`, components);
  }

  if (kind === "poll") {
    if (!["yes","no"].includes(action)) return commandReply("잘못된 투표 버튼.", true);
    await vote(env.DB, id, userId, action);
    const count = await pollCounts(env.DB, id);
    const components = [{
      type: 1,
      components: [
        { type: 2, style: BTN.SUCCESS, label: "찬성", custom_id: `poll:yes:${id}` },
        { type: 2, style: BTN.DANGER, label: "반대", custom_id: `poll:no:${id}` }
      ]
    }];
    return updateReply(`🗳️ **투표**\n${session.question}\n\n✅ 찬성 **${count.yes}** · ❌ 반대 **${count.no}**`, components);
  }

  return commandReply("알 수 없는 버튼.", true);
}