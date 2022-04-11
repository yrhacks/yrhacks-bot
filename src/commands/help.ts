import { Command } from "../command";
import { MessageEmbed } from "discord.js";

export const command: Command = {
  name: "help",
  title: "Help Command",
  description: "sends a link to other",
  requiredPerms: [],
  requiresSetup: false,
  execute: async (_client, msg, _args, _db): Promise<void> => {
    await msg.channel.send({embeds: [
        new MessageEmbed({
            title: "Help",
            url: "https://sunrise-snout-a2f.notion.site/Bot-Commands-54fc7135bd354bf6b1758b3a9d77d94b",
            description: "Hi here's the help page because the developer didn't want to create an actual help command",
            color: "#5452DD"
        })
    ]});
  },
};
