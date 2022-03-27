import { Client, Message, MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";

import { DbGuildInfo, fetchGuild } from "./db";
import { GuildMessage, isGuildMessage } from "./utils";

interface ReactionHandler {
  emoji: string;
  handle(
    kind: "add" | "remove",
    reaction: MessageReaction,
    user: User,
    msg: GuildMessage,
    db: DbGuildInfo,
  ): Promise<void>;
}

const reactions: Map<string, ReactionHandler> = new Map();

export const onChannelReaction = (
  channel: string,
  emoji: string,
  handler: ReactionHandler["handle"],
): void => {
  // TODO: better typing of channel name?
  // but typeof DbGuildInfo["channels"] doesn't seem to work
  reactions.set(channel, {
    emoji,
    handle: handler,
  });
};

const handle = async (
  kind: "add" | "remove",
  bot: Client,
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> => {
  console.log("huh?");
  if (reaction.partial) {
    await reaction.fetch();
  }
  if (reaction.partial) {
    return;
  }
  const { message: msg } = reaction;
  if (msg.partial) {
    await msg.fetch();
  }
  console.log(`${JSON.stringify([reaction, msg])}`);
  if (msg.partial) {
    // satisfy typescript Message | PartialMessage union
    return;
  }
  console.log("here1");
  if (!isGuildMessage(msg)) {
    return;
  }
  console.log("here2");
  if (msg.author.id !== bot.user?.id) {
    return;
  }
  console.log("here3");
  if (msg.channel.type !== "GUILD_TEXT") {
    return;
  }
  console.log("here4");
  const handler = reactions.get(msg.channel.name);
  if (handler === undefined) {
    return;
  }
  console.log("here5");
  if (reaction.emoji.name !== handler.emoji) {
    return;
  }
  console.log("here6");
  if (user.partial) {
    await user.fetch();
  }
  if (user.partial) {
    return;
  }
  console.log("here7");
  if (user.id === bot.user?.id) {
    return;
  }
  console.log("here8");
  const db = await fetchGuild(msg.guild);
  if (db === undefined) {
    return;
  }
  console.log("here9");

  // user already fetched
  await handler.handle(kind, reaction, user, msg, db);
};

export const registerReactions = (bot: Client): void => {
  bot.on("messageReactionAdd", handle.bind(undefined, "add", bot));
  bot.on("messageReactionRemove", handle.bind(undefined, "remove", bot));
};
