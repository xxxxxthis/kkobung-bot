import { InteractionType, InteractionResponseType, verifyKey } from "discord-interactions";
import { COMMANDS } from "./commands.js";
import {
  json, commandReply, updateReply, getOption, getResolvedUser, displayName,
  randomInt, shuffle, deterministicPercent, kstDate, fortuneFor, isAdmin
} from "./utils.js";
import {
  ensureUser, getUserRow, addCoins, transferCoins, topCoins,
  createSession, addSessionMember, removeSessionMember, sessionMembers,
  getSession, closeSession, vote, pollCounts,
  shopItems, shopItem, buyItem, inventory, grantAchievement, achievements,
  addWarning, warningsFor
} from "./database.js";

const BTN={PRIMARY:1,SECONDARY:2,SUCCESS:3,DANGER:4};

export default {
  async fetch(request, env) {
    const url=new URL(request.url);

    if (url.pathname==="/") return new Response("꼬붕봇 v2 살아있음 🤖");

    if (url.pathname==="/register") {
      if (request.method!=="POST") return new Response("POST only",{status:405});
      if (request.headers.get("Authorization")!==`Bearer ${env.SETUP_SECRET}`) return new Response("Unauthorized",{status:401});

      const ep=`https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.DISCORD_GUILD_ID}/commands`;
      const r=await fetch(ep,{
        method:"PUT",
        headers:{
          "Authorization":`Bot ${env.DISCORD_TOKEN}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify(COMMANDS)
      });
      return new Response(await r.text(),{status:r.status,headers:{"Content-Type":"application/json"}});
    }

    if (url.pathname!=="/discord") return new Response("Not Found",{status:404});
    if (request.method!=="POST") return new Response("Method Not Allowed",{status:405});

    const sig=request.headers.get("X-Signature-Ed25519");
    const ts=request.headers.get("X-Signature-Timestamp");
    const raw=await request.clone().arrayBuffer();

    if (!sig||!ts||!env.DISCORD_PUBLIC_KEY) return new Response("Missing verification data",{status:401});
    if (!(await verifyKey(raw,sig,ts,env.DISCORD_PUBLIC_KEY.trim()))) return new Response("Bad signature",{status:401});

    const i=await request.json();
    if (i.type===InteractionType.PING) return json({type:InteractionResponseType.PONG});
    if (!env.DB) return commandReply("❌ D1 binding `DB`가 없음.",true);

    try {
      if (i.type===InteractionType.APPLICATION_COMMAND) return await handleCommand(i,env);
      if (i.type===3) return await handleComponent(i,env);
      return commandReply("아직 지원하지 않는 Interaction.",true);
    } catch(e) {
      console.error(e);
      return commandReply(`❌ 오류: ${e?.message ?? String(e)}`,true);
    }
  }
};

async function handleCommand(i,env) {
  const c=i.data.name, gid=i.guild_id;
  const uid=i.member?.user?.id ?? i.user?.id;
  const name=displayName(i);
  await ensureUser(env.DB,gid,uid);

  if (c==="핑") return commandReply("🏓 **퐁!** 꼬붕봇 v2 정상 작동 중 🤖");

  if (c==="출석") {
    const today=kstDate(), yesterday=kstDate(-1);
    const u=await getUserRow(env.DB,gid,uid);
    if (u.last_attendance===today) return commandReply("이미 오늘 출석했음 ㅋㅋ",true);

    const streak = u.last_attendance===yesterday ? Number(u.streak||0)+1 : 1;
    const reward = 100 + Math.min(streak-1,10)*10;

    await env.DB.prepare(`UPDATE users SET coins=coins+?, attendance_count=attendance_count+1,
      last_attendance=?, streak=? WHERE guild_id=? AND user_id=?`)
      .bind(reward,today,streak,gid,uid).run();

    if (streak>=7) await grantAchievement(env.DB,gid,uid,"streak7");
    if (streak>=30) await grantAchievement(env.DB,gid,uid,"streak30");

    const up=await getUserRow(env.DB,gid,uid);
    return commandReply(`✅ **출석 완료**\n💰 +${reward} 코인\n🔥 연속 출석 **${streak}일**\n📅 총 출석 **${up.attendance_count}회**\n💵 잔액 **${Number(up.coins).toLocaleString()}**`);
  }

  if (c==="잔액") {
    const tid=getOption(i,"유저")??uid;
    const ru=getResolvedUser(i,tid);
    const u=await getUserRow(env.DB,gid,tid);
    return commandReply(`💰 **${ru?.global_name ?? ru?.username ?? (tid===uid?name:"유저")}의 지갑**\n**${Number(u.coins).toLocaleString()} 꼬붕코인**`);
  }

  if (c==="송금") {
    const tid=getOption(i,"유저"), amount=Number(getOption(i,"금액"));
    if (tid===uid) return commandReply("자기 자신한테 송금 불가 ㅋㅋ",true);
    const r=await transferCoins(env.DB,gid,uid,tid,amount);
    if (!r.ok) return commandReply(`💸 코인 부족. 현재 ${Number(r.balance).toLocaleString()}`,true);
    await grantAchievement(env.DB,gid,uid,"first_transfer");
    return commandReply(`💸 <@${tid}>에게 **${amount.toLocaleString()} 코인** 송금 완료.`);
  }

  if (c==="랭킹") {
    const rows=await topCoins(env.DB,gid,10);
    const medals=["🥇","🥈","🥉"];
    return commandReply(`🏆 **꼬붕코인 TOP 10**\n\n${rows.map((r,n)=>`${medals[n]??`**${n+1}.**`} <@${r.user_id}> — **${Number(r.coins).toLocaleString()}**`).join("\n") || "데이터 없음"}`);
  }

  if (c==="코인플립") {
    const amount=Number(getOption(i,"금액")), choice=getOption(i,"선택");
    const u=await getUserRow(env.DB,gid,uid);
    if (amount>u.coins) return commandReply(`💸 코인 부족. 현재 ${Number(u.coins).toLocaleString()}`,true);
    const result=randomInt(0,1)?"front":"back", win=result===choice;
    const up=await addCoins(env.DB,gid,uid,win?amount:-amount);
    if (win && amount>=1000) await grantAchievement(env.DB,gid,uid,"big_win");
    return commandReply(`🪙 **${result==="front"?"앞":"뒤"}!**\n${win?"🎉 승리":"💀 패배"}\n${win?"+":"-"}${amount.toLocaleString()} 코인\n💵 잔액 **${Number(up.coins).toLocaleString()}**`);
  }

  if (c==="슬롯") {
    const amount=Number(getOption(i,"금액"));
    const u=await getUserRow(env.DB,gid,uid);
    if (amount>u.coins) return commandReply(`💸 코인 부족. 현재 ${Number(u.coins).toLocaleString()}`,true);

    const icons=["🍒","🍋","🍇","🔔","7️⃣"];
    const a=icons[randomInt(0,4)],b=icons[randomInt(0,4)],d=icons[randomInt(0,4)];
    let delta=-amount,msg="💀 꽝";
    if (a===b&&b===d){delta=amount*4;msg="🎰 JACKPOT!";await grantAchievement(env.DB,gid,uid,"jackpot");}
    else if(a===b||b===d||a===d){delta=amount;msg="✨ 2개 일치!";}
    const up=await addCoins(env.DB,gid,uid,delta);
    return commandReply(`🎰 **SLOT**\n\n${a} | ${b} | ${d}\n\n${msg}\n${delta>=0?"+":""}${delta.toLocaleString()} 코인\n💵 잔액 **${Number(up.coins).toLocaleString()}**`);
  }

  if (c==="주사위") return commandReply(`🎲 **${name}** → **${randomInt(1,100)}**`);

  if (c==="가위바위보") {
    const me=getOption(i,"선택");
    const vals=["scissors","rock","paper"], bot=vals[randomInt(0,2)];
    const ko={scissors:"✌️ 가위",rock:"✊ 바위",paper:"✋ 보"};
    let result="🤝 무승부";
    if ((me==="scissors"&&bot==="paper")||(me==="rock"&&bot==="scissors")||(me==="paper"&&bot==="rock")) result="🎉 승리";
    else if (me!==bot) result="💀 패배";
    return commandReply(`✊ **가위바위보**\n너: ${ko[me]}\n꼬붕봇: ${ko[bot]}\n\n${result}`);
  }

  if (c==="골라줘") {
    const arr=String(getOption(i,"선택지")).split(/[,/|]/).map(x=>x.trim()).filter(Boolean);
    if(arr.length<2) return commandReply("선택지 2개 이상 넣어줘.",true);
    return commandReply(`🎯 **꼬붕봇의 선택**\n👉 **${arr[randomInt(0,arr.length-1)]}**`);
  }

  if(c==="운세") return commandReply(`🔮 **${name}의 오늘의 운세**\n\n${fortuneFor(uid)}`);

  if(c==="전투력") {
    const p=randomInt(1,999999);
    const rank=p>=900000?"SSS":p>=700000?"S":p>=500000?"A":p>=300000?"B":p>=100000?"C":p>=30000?"D":"F";
    return commandReply(`⚔️ **전투력 측정**\n👤 ${name}\n💥 **${p.toLocaleString()}**\n🏆 **${rank}**`);
  }

  if(c==="궁합") {
    const tid=getOption(i,"상대"),ru=getResolvedUser(i,tid);
    const score=deterministicPercent(uid,tid);
    const txt=score>=90?"🔥 운명급":score>=70?"😏 꽤 좋음":score>=50?"🤝 무난함":score>=30?"🤨 애매함":"💀 서로 멀리 있으십시오.";
    return commandReply(`💘 **궁합 테스트**\n${name} × ${ru?.global_name??ru?.username??"상대"}\n❤️ **${score}%**\n${txt}`);
  }

  if(c==="팀짜기") {
    const m=String(getOption(i,"멤버")).split(/[,/|]/).map(x=>x.trim()).filter(Boolean);
    if(m.length<2) return commandReply("2명 이상 넣어줘.",true);
    const s=shuffle(m),mid=Math.ceil(s.length/2);
    return commandReply(`⚔️ **랜덤 팀 배정**\n\n🔵 **TEAM A**\n${s.slice(0,mid).map(x=>`• ${x}`).join("\n")}\n\n🔴 **TEAM B**\n${s.slice(mid).map(x=>`• ${x}`).join("\n")||"• 없음"}`);
  }

  if(c==="내전") {
    const id=crypto.randomUUID().slice(0,8);
    await createSession(env.DB,id,gid,uid,"scrim");
    await addSessionMember(env.DB,id,uid);
    return commandReply(`🎮 **내전 모집**\n주최: <@${uid}>\n\n현재 참가자\n• <@${uid}>`,false,[{
      type:1,components:[
        {type:2,style:BTN.SUCCESS,label:"참가",custom_id:`scrim:join:${id}`},
        {type:2,style:BTN.SECONDARY,label:"취소",custom_id:`scrim:leave:${id}`},
        {type:2,style:BTN.PRIMARY,label:"팀 짜기",custom_id:`scrim:teams:${id}`},
        {type:2,style:BTN.DANGER,label:"마감",custom_id:`scrim:close:${id}`}
      ]
    }]);
  }

  if(c==="투표") {
    const q=String(getOption(i,"질문")),id=crypto.randomUUID().slice(0,8);
    await createSession(env.DB,id,gid,uid,"poll",q);
    return commandReply(`🗳️ **투표**\n${q}\n\n✅ 찬성 **0** · ❌ 반대 **0**`,false,[{
      type:1,components:[
        {type:2,style:BTN.SUCCESS,label:"찬성",custom_id:`poll:yes:${id}`},
        {type:2,style:BTN.DANGER,label:"반대",custom_id:`poll:no:${id}`}
      ]
    }]);
  }

  if(c==="상점") {
    const items=await shopItems(env.DB);
    if(!items.length) return commandReply("상점 비어있음.",true);
    return commandReply(`🛒 **꼬붕 상점**\n\n${items.map(x=>`${x.emoji} **${x.name}** \`${x.id}\`\n└ ${Number(x.price).toLocaleString()}코인 · ${x.description}`).join("\n\n")}\n\n구매: \`/구매 아이템:<ID>\``);
  }

  if(c==="구매") {
    const id=String(getOption(i,"아이템"));
    const item=await shopItem(env.DB,id);
    if(!item) return commandReply("그런 아이템 없음. `/상점` 확인해봐.",true);
    const r=await buyItem(env.DB,gid,uid,item);
    if(!r.ok) return commandReply(`💸 코인 부족. 현재 ${Number(r.balance).toLocaleString()}`,true);
    await grantAchievement(env.DB,gid,uid,"first_buy");
    return commandReply(`🛍️ **구매 완료**\n${item.emoji} ${item.name} ×1\n💰 -${Number(item.price).toLocaleString()} 코인`);
  }

  if(c==="인벤토리") {
    const tid=getOption(i,"유저")??uid;
    const ru=getResolvedUser(i,tid);
    const items=await inventory(env.DB,gid,tid);
    return commandReply(`🎒 **${ru?.global_name??ru?.username??(tid===uid?name:"유저")}의 인벤토리**\n\n${items.length?items.map(x=>`${x.emoji} **${x.name}** ×${x.quantity}`).join("\n"):"비어있음."}`);
  }

  if(c==="업적") {
    const a=await achievements(env.DB,gid,uid);
    return commandReply(`🏅 **${name}의 업적**\n\n${a.map(x=>`${x.unlocked?"✅":"⬛"} ${x.emoji} **${x.name}** — ${x.description}`).join("\n")}`);
  }

  if(c==="프로필") {
    const tid=getOption(i,"유저")??uid;
    const ru=getResolvedUser(i,tid),u=await getUserRow(env.DB,gid,tid),inv=await inventory(env.DB,gid,tid);
    const ach=await achievements(env.DB,gid,tid);
    const unlocked=ach.filter(x=>x.unlocked).length;
    return commandReply(`👤 **${ru?.global_name??ru?.username??(tid===uid?name:"유저")}**\n💰 코인 **${Number(u.coins).toLocaleString()}**\n🔥 연속 출석 **${Number(u.streak||0)}일**\n📅 총 출석 **${u.attendance_count}회**\n⚔️ 승리 **${u.wins}** · 💀 패배 **${u.losses}**\n⭐ MVP **${u.mvp}회**\n🎒 아이템 종류 **${inv.length}개**\n🏅 업적 **${unlocked}/${ach.length}**`);
  }

  if(c==="코인지급"||c==="코인회수") {
    if(!isAdmin(i)) return commandReply("관리자만 사용할 수 있음.",true);
    const tid=getOption(i,"유저"), amount=Number(getOption(i,"금액"));
    const up=await addCoins(env.DB,gid,tid,c==="코인지급"?amount:-amount);
    return commandReply(`${c==="코인지급"?"💰 지급":"🧹 회수"} 완료\n<@${tid}> 현재 잔액 **${Number(up.coins).toLocaleString()}**`);
  }

  if(c==="경고") {
    if(!isAdmin(i)) return commandReply("관리자만 사용할 수 있음.",true);
    const tid=getOption(i,"유저"),reason=String(getOption(i,"사유"));
    await addWarning(env.DB,gid,tid,uid,reason);
    return commandReply(`⚠️ <@${tid}> 경고 부여\n사유: **${reason}**`);
  }

  if(c==="경고조회") {
    const tid=getOption(i,"유저");
    const ws=await warningsFor(env.DB,gid,tid);
    return commandReply(`⚠️ **<@${tid}> 경고 기록**\n\n${ws.length?ws.map((w,n)=>`${n+1}. ${w.reason} · 관리자 <@${w.admin_id}>`).join("\n"):"경고 없음."}`);
  }

  return commandReply("아직 구현 안 된 명령어.",true);
}

async function handleComponent(i,env) {
  const [kind,action,id]=String(i.data.custom_id).split(":");
  const uid=i.member?.user?.id??i.user?.id;
  const s=await getSession(env.DB,id);
  if(!s||s.status!=="open") return commandReply("이미 끝난 세션이거나 찾을 수 없음.",true);

  if(kind==="scrim") {
    if(action==="join") await addSessionMember(env.DB,id,uid);
    if(action==="leave") await removeSessionMember(env.DB,id,uid);
    if(action==="close") {
      if(uid!==s.owner_id) return commandReply("주최자만 마감 가능.",true);
      await closeSession(env.DB,id);
      const m=await sessionMembers(env.DB,id);
      return updateReply(`🔒 **내전 모집 마감**\n참가자 ${m.length}명\n${m.map(x=>`• <@${x}>`).join("\n")}`,[]);
    }
    const m=await sessionMembers(env.DB,id);
    if(action==="teams") {
      if(uid!==s.owner_id) return commandReply("주최자만 팀 짜기 가능.",true);
      if(m.length<2) return commandReply("참가자 2명 이상 필요.",true);
      const x=shuffle(m),mid=Math.ceil(x.length/2);
      return updateReply(`⚔️ **내전 팀 배정**\n\n🔵 **TEAM A**\n${x.slice(0,mid).map(v=>`• <@${v}>`).join("\n")}\n\n🔴 **TEAM B**\n${x.slice(mid).map(v=>`• <@${v}>`).join("\n")}`,[{
        type:1,components:[
          {type:2,style:BTN.SUCCESS,label:"참가",custom_id:`scrim:join:${id}`},
          {type:2,style:BTN.SECONDARY,label:"취소",custom_id:`scrim:leave:${id}`},
          {type:2,style:BTN.PRIMARY,label:"다시 섞기",custom_id:`scrim:teams:${id}`},
          {type:2,style:BTN.DANGER,label:"마감",custom_id:`scrim:close:${id}`}
        ]
      }]);
    }
    return updateReply(`🎮 **내전 모집**\n주최: <@${s.owner_id}>\n\n현재 참가자 (${m.length})\n${m.map(x=>`• <@${x}>`).join("\n")||"없음"}`,[{
      type:1,components:[
        {type:2,style:BTN.SUCCESS,label:"참가",custom_id:`scrim:join:${id}`},
        {type:2,style:BTN.SECONDARY,label:"취소",custom_id:`scrim:leave:${id}`},
        {type:2,style:BTN.PRIMARY,label:"팀 짜기",custom_id:`scrim:teams:${id}`},
        {type:2,style:BTN.DANGER,label:"마감",custom_id:`scrim:close:${id}`}
      ]
    }]);
  }

  if(kind==="poll") {
    await vote(env.DB,id,uid,action);
    const c=await pollCounts(env.DB,id);
    return updateReply(`🗳️ **투표**\n${s.question}\n\n✅ 찬성 **${c.yes}** · ❌ 반대 **${c.no}**`,[{
      type:1,components:[
        {type:2,style:BTN.SUCCESS,label:"찬성",custom_id:`poll:yes:${id}`},
        {type:2,style:BTN.DANGER,label:"반대",custom_id:`poll:no:${id}`}
      ]
    }]);
  }

  return commandReply("알 수 없는 버튼.",true);
}