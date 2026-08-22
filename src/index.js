import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("꼬붕봇 살아있음 🤖", { status: 200 });
    }

    if (url.pathname !== "/discord") {
      return new Response("Not Found", { status: 404 });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const signature = request.headers.get("X-Signature-Ed25519");
    const timestamp = request.headers.get("X-Signature-Timestamp");
    const rawBody = await request.clone().arrayBuffer();

    if (!signature || !timestamp || !env.DISCORD_PUBLIC_KEY) {
      return new Response("Missing Discord verification data", { status: 401 });
    }

    const isValid = await verifyKey(
      rawBody,
      signature,
      timestamp,
      env.DISCORD_PUBLIC_KEY.trim()
    );

    if (!isValid) {
      return new Response("Bad request signature", { status: 401 });
    }

    const interaction = await request.json();

    if (interaction.type === InteractionType.PING) {
      return Response.json({
        type: InteractionResponseType.PONG,
      });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      if (interaction.data?.name === "핑") {
        return Response.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "🏓 퐁! 꼬붕봇 정상 작동 중 🤖",
          },
        });
      }
    }

    return Response.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "아직 구현 전인 기능임 ㅋㅋ",
        flags: 64,
      },
    });
  },
};
