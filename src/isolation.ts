import { Client, Presence, MessageEmbed, GuildManager, GuildMember, User } from "discord.js";

import { config } from "./config";
import { fetchChannel, fetchGuild } from "./db";
import { onChannelReaction } from "./reactions";
import { makeUserString, mention } from "./utils";

export const registerIsolation = (bot: Client): void => {
  bot.on("guildMemberAdd", async (member): Promise<void> => {
    const { user, guild } = member;

    const db = await fetchGuild(guild);
    if (db === undefined) {
      return;
    }

    const target = fetchChannel(guild, db.channels.approvals);
    if (target === undefined) {
      return;
    }
    if (!target.isText()) {
      console.warn(`approvals channel ${target.id} is not a text channel`);
      return;
    }

    let fields;
    for (const activity of member.presence?.activities ?? []) {
      if (activity.type === "CUSTOM" && activity.state !== null) {
        fields = [
          {
            name: "Status:",
            value: activity.state,
          },
        ];
      }
    }

    const embed = {
      description: "User Joined",
      timestamp: Date.now(),
      thumbnail: {
        url: user.displayAvatarURL({ dynamic: true, size: 512 }),
      },
      fields,
      author: {
        name: await makeUserString(user),
      },
    };

    const msg = await target.send({content: user.id, embeds: [new MessageEmbed(embed)]});
    const newDescription = `User Joined\nReject with:\n**${config.prefix}deny ${msg.id} reason...**`;
    await msg.edit({embeds: [new MessageEmbed(embed).setDescription(newDescription)]});
    await msg.react("✅");
  });

  onChannelReaction(
    "approvals",
    "✅",
    async (kind, _reaction, user, msg, db): Promise<void> => {
      if (kind === "remove") {
        return;
      }
      const { content } = msg;
      if (content.match(/^[0-9]+$/) === null) {
        return;
      }
      const member = await msg.guild.members.fetch(content);
      if (member === null) {
        return;
      }
      if (member.roles.highest.id !== msg.guild.roles.everyone.id) {
        await msg.edit(`${content} - User already has roles`);
        await msg.reactions.removeAll();
        return;
      }
      const reason = `${content} - Approved by ${mention(user)}`;
      await member.roles.add(db.roles.pending, reason);
      await msg.edit(reason);
      await msg.reactions.removeAll();
    },
  );
};
