import { Client, Intents } from "discord.js";

import { registerCensoring } from "./censoring";
import { registerCommands } from "./command";
import { registerEventLogging } from "./eventLogger";
import { registerIsolation } from "./isolation";
import { registerMessageLogging } from "./messageLogger";
import { registerReactions } from "./reactions";
import { registerMentorTickets } from "./tickets";

const bot = new Client({
  partials: [ "MESSAGE", "REACTION", "USER" ],
  intents: [
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_INVITES,
  ],
  // messageCacheMaxSize: 1000,
});

bot.on("ready", (): void => {
  console.log("logged in");
  registerEventLogging(bot);
});

registerMessageLogging(bot);
// registerCensoring(bot);
registerReactions(bot);
registerCommands(bot);
registerIsolation(bot);
registerMentorTickets();

await bot.login(process.env.DISCORD_BOT_TOKEN);
