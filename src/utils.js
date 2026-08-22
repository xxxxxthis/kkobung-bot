export const EPHEMERAL = 64;

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json; charset=UTF-8", ...(init.headers || {}) }
  });
}

export function commandReply(content, ephemeral = false, components = undefined) {
  return json({
    type: 4,
    data: {
      content,
      allowed_mentions: { parse: [] },
      ...(ephemeral ? { flags: EPHEMERAL } : {}),
      ...(components ? { components } : {})
    }
  });
}

export function updateReply(content, components = []) {
  return json({
    type: 7,
    data: {
      content,
      allowed_mentions: { parse: [] },
      components
    }
  });
}

export function getOption(interaction, name) {
  return interaction.data?.options?.find(o => o.name === name)?.value;
}

export function getUser(interaction, userId) {
  return interaction.data?.resolved?.users?.[userId];
}

export function displayName(interaction) {
  const u = interaction.member?.user ?? interaction.user ?? {};
  return u.global_name ?? u.username ?? "알 수 없음";
}

export function randomInt(min, max) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return min + (a[0] % (max - min + 1));
}

export function deterministicPercent(a, b) {
  const key = [String(a), String(b)].sort().join(":");
  let hash = 2166136261;
  for (const c of key) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 101;
}

export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function todayKST() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export function fortuneFor(userId) {
  const d = todayKST();
  const fortunes = [
    "오늘은 뭐 하나 질러도 되는 날.",
    "게임에서 캐리할 확률 상승.",
    "괜히 깝치면 억까당할 가능성 높음.",
    "먹을 복이 있음. 누군가 얻어먹여줄지도.",
    "돈은 아끼고 웃음은 많이 챙기는 날.",
    "오늘의 키워드: 일단 ㄱ.",
    "별일 없는 게 최고의 운세다 ㅋㅋ",
    "친구한테 연락하면 재밌는 일 생길 확률 높음."
  ];
  let h = 0;
  for (const c of `${userId}:${d}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return fortunes[h % fortunes.length];
}