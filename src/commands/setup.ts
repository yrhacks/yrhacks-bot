import { Channel, ColorResolvable, OverwriteData, PermissionResolvable, Role } from "discord.js";

import { Command } from "../command";
import { config, OverwriteConfig } from "../config";
import { DbRolesInfo, DbChannelsInfo, initGuild } from "../db";

const makeOverwrites = (
  overwrites: OverwriteConfig[] | undefined,
  roles: Map<string, Role>,
): OverwriteData[] | undefined => {
  if (overwrites === undefined) {
    return undefined;
  }

  const data: OverwriteData[] = [];
  for (const overwrite of overwrites) {
    for (const roleName of overwrite.id) {
      const role = roles.get(roleName);
      if (role === undefined) {
        console.warn(`'${roleName}' was not found while constructing overwrite`);
      } else {
        data.push({
          id: role,
          allow: overwrite.allow as PermissionResolvable,
          type: "role",
        });
      }
    }
  }
  return data;
};

export const command: Command = {
  name: "setup",
  title: "Server Setup",
  description: "Creates channels and roles for the server, storing created IDs",
  requiredPerms: [ "ADMINISTRATOR" ],
  requiresSetup: false,
  execute: async (_client, msg, _args, _db): Promise<void> => {
    if (!config.enableSetup) {
      return;
    }

    const { guild } = msg;
    const { roles, channels } = guild;

    const roleMap: Map<string, Role> = new Map();
    const channelMap: Map<string, Channel> = new Map();

    // remove existing roles synchronously
    // (channels are removed synchronously because of visual bugs,
    // roles dont seem to be affected but just do it synchronously)
    for (const role of roles.cache.values()) {
      if (!role.editable || role.id === roles.everyone.id) {
        console.warn(`could not delete an uneditable role: ${role.name}`);
      } else {
        await role.delete("Bot setup command");
      }
    }

    // create roles
    await roles.everyone.setPermissions(
      [],
      "Bot setup command",
    );
    roleMap.set("everyone", roles.everyone);

    for (const role of config.roles) {
      const roleObj = await roles.create({
        name: role.name,
        color: role.color as ColorResolvable,
        hoist: role.hoist ?? false,
        permissions: role.permissions as PermissionResolvable,
        mentionable: role.mentionable ?? false,
      });
      roleMap.set(role.name, roleObj);
    }

    // remove all existing channels synchronously
    // (there's a visual bug when you remove them too quickly)
    for (const channel of channels.cache.values()) {
      await channel.delete("Bot setup command");
    }

    // create channels
    for (const category of config.channels) {
      const categoryObj = await channels.create(
        category.name,
        {
          type: "GUILD_CATEGORY",
          permissionOverwrites: makeOverwrites(category.permissionOverwrites, roleMap),
          reason: "Bot setup command",
        },
      );
      channelMap.set(category.name, categoryObj);
      for (const channel of category.channels ?? []) {
        const channelObj = await channels.create(
          channel.name,
          {
            type: channel.type ?? "GUILD_TEXT",
            parent: categoryObj,
            topic: channel.topic,
            permissionOverwrites: makeOverwrites(channel.permissionOverwrites, roleMap),
            reason: "Bot setup command",
          },
        );
        channelMap.set(channel.name, channelObj);
      }
    }

    const roleIds = Array.from(roleMap.entries(), ([name, role]) => [name, role.id]);
    const channelIds = Array.from(channelMap.entries(), ([name, channel]) => [name, channel.id]);

    await initGuild(
      guild,
      Object.fromEntries(roleIds) as DbRolesInfo,
      Object.fromEntries(channelIds) as DbChannelsInfo,
    );

    // set settings

    // silly tslint not realising that undefined is not an
    // acceptable argument for the function...
    // tslint:disable-next-line: no-null-keyword
    await guild.setSystemChannel(null, "Bot setup command");
    await guild.edit(
      {
        verificationLevel: "LOW",
        explicitContentFilter: "ALL_MEMBERS",
        defaultMessageNotifications: "ONLY_MENTIONS",
      },
      "Bot setup command",
    );
  },
};
