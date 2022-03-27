import { ColorResolvable } from "discord.js";
import { Command } from "../command";
import { config } from "../config";
import { addMarkerRole } from "../db";

export const command: Command = {
  name: "create_role",
  title: "Create a Marker Role",
  description: "Creates a role that anyone with CHANGE_NICKNAME permissions can freely assign to themselves",
  requiredPerms: [ "MANAGE_ROLES" ],
  requiresSetup: true,
  execute: async (_client, msg, args, db): Promise<void> => {
    if (args.length < 1) {
      return;
    }

    const { guild } = msg;

    for (const roleName of args) {
      if (db.markerRoles[roleName] === undefined) {
        const role = await guild.roles.create({
          name: roleName,
          color: config.markerRoleColour as ColorResolvable,
          hoist: false,
          permissions: [],
          mentionable: true,
        });
        await addMarkerRole(guild, role);
      }
    }
  },
};
