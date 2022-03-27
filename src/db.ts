import { Guild, GuildChannel, Role } from "discord.js";
import fp from "lodash/fp";
// import FileAsync from "lowdb/adapters/FileAsync";
// import lowdb from "lowdb/lib/fp";
const { set, unset } = fp;
import { Low, JSONFile } from "lowdb";

import { config } from "./config";

export type DbRolesInfo = {
  participant: string;
  mentor: string;
  pending: string;
  // role name -> id
  [roleName: string]: string | undefined;
}
export type DbChannelsInfo = {

  approvals: string;
  Mentorship: string;
  tickets: string;
  log: string;
  isolation: string;
  // channel name -> id
  [channelName: string]: string | undefined;
}

// hard to type this better since the specific roles/channels
// will somewhat depend on config, however the rest of the
// bot will probably hardcode strings that are written in
// config too (e.g. access role id of the "mentor" role)
// so not sure what to do...
export interface DbGuildInfo {
  roles: DbRolesInfo;
  channels: DbChannelsInfo;
  markerRoles: {
    [roleName: string]: string | undefined;
  };
  tickets: {
    // help channel id -> ticket message id
    // ticket message id -> help channel id
    [id: string]: string | undefined;
  };
}

export interface DbUserInfo {
  users: {
    // user id -> unique invite code
    [id: string]: string | undefined;
  };
  codes: {
    // unique invite code -> user id
    [code: string]: string | undefined;
  };
}

interface DbSchema {
  [key: string]: DbGuildInfo | undefined;
}

const adapter = new JSONFile<DbSchema>(config.dbFile);
export const db = new Low(adapter);

const userAdapter = new JSONFile<DbUserInfo>(config.dbUserFile);
export const dbUser = new Low(userAdapter);

export const initGuild = async (
  guild: Guild,
  roles: DbRolesInfo,
  channels: DbChannelsInfo,
): Promise<void> => {
  await db.read();
  // RIP
  if (db.data === null) {
    db.data ||= {
      [guild.id]: {
        roles,
        channels,
        markerRoles: {},
        tickets: {},
      }
    };
  } else {
    db.data[guild.id] = {
      roles,
      channels,
      markerRoles: {},
      tickets: {},
    };
  }
  await db.write();
};

export const fetchGuild = async (guild: Guild): Promise<DbGuildInfo> => {
  await db.read();
  const guildDb = db.data?.[guild.id];
  if (guildDb === undefined) {
    throw new Error(`guild ${guild.id} (${guild.name}) not setup properly`);
  }
  return guildDb;
};

export const fetchRole = (guild: Guild, id: string): Role | undefined => {
  const role = guild.roles.resolve(id);
  if (role === null) {
    console.warn(`role ${id} is not in the right guild ${guild.id}`);
    return undefined;
  }
  return role;
};

export const addMarkerRole = async (
  guild: Guild,
  role: Role,
): Promise<void> => {
  const guildDb = await fetchGuild(guild);
  guildDb.markerRoles[role.name] = role.id;
  await db.write();
};

export const removeMarkerRole = async (
  guild: Guild,
  role: string,
): Promise<void> => {
  const guildDb = await fetchGuild(guild);
  delete guildDb.markerRoles[role];
  await db.write();
};

export const addTicket = async (
  guild: Guild,
  channelId: string,
  messageId: string,
): Promise<void> => {
  const guildDb = await fetchGuild(guild);
  guildDb.tickets[channelId] = messageId;
  guildDb.tickets[messageId] = channelId;
  await db.write();
};

export const removeTicket = async (
  guild: Guild,
  channelId: string,
  messageId: string,
): Promise<void> => {
  const guildDb = await fetchGuild(guild);
  delete guildDb.tickets[channelId];
  delete guildDb.tickets[messageId];
  await db.write();
};

export const fetchChannel = (
  guild: Guild,
  id: string,
): GuildChannel | undefined => {
  const channel = guild.channels.resolve(id);
  if (channel === null) {
    console.warn(`channel ${id} is not in the right guild ${guild.id}`);
    return undefined;
  }
  return channel as GuildChannel;
};

export const getUsers = async (): Promise<DbUserInfo> => {
  await dbUser.read();
  if (dbUser.data === null) {
    dbUser.data = {
      users: {},
      codes: {},
    };
    await dbUser.write();
  }
  return dbUser.data;
};

export const addUser = async (code: string, user: string): Promise<void> => {
  const userDb = await getUsers();
  userDb.codes[code] = user;
  userDb.users[user] = code;
  await dbUser.write();
};

export const getCode = async (id: string): Promise<string | undefined> => {
  const userDb = await getUsers();
  return userDb.users[id];
}
