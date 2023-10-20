import axios from 'npm:axios';

import System, { ISystem } from './structures/system.ts';
import Member, { IMember } from './structures/member.ts';
import Group, { IGroup } from './structures/group.ts';
import Switch, { ISwitch } from './structures/switch.ts';
import Message, { IMessage } from './structures/message.ts';
import SystemConfig, { ISystemConfig } from './structures/systemConfig.ts';
import SystemGuildSettings, { ISystemGuildSettings } from './structures/systemGuildSettings.ts';
import SystemAutoproxySettings, { ISystemAutoproxySettings } from './structures/systemAutoproxySettings.ts';
import MemberGuildSettings, { IMemberGuildSettings } from './structures/memberGuildSettings.ts';

import APIError from './structures/apiError.ts';

import ROUTES from './routes.ts';

export interface APIData {
  base_url?: string;
  version?: number;
  token?: string;
  user_agent?: string;
}

export interface RequestOptions {
  token?: string;
}

export interface GetSystemOptions extends RequestOptions {
  system?: string;
  fetch?: Array<SystemFetchOptions>;
  raw?: boolean;
}

export const enum SystemFetchOptions {
  Members = 'members',
  Fronters = 'fronters',
  Switches = 'switches',
  Groups = 'groups',
  Config = 'config',
}

export type RequestData<T extends {}> = T & {
  token?: string;
};

class PKAPI {
  #token?: string;
  #inst;
  #_base: string = 'https://api.pluralkit.me';
  #_version: number = 2;
  #user_agent: string = 'PKAPI.js/5.x';

  #version_warning = false;

  constructor(data?: APIData) {
    this.#_base = data?.base_url ?? 'https://api.pluralkit.me';
    this.#_version = data?.version ?? 2;
    this.#token = data?.token;
    this.#user_agent = data?.user_agent ?? 'PKAPI.js/5.x';

    this.#inst = axios.create({
      validateStatus: (s) => s < 300 && s > 100,
      baseURL: `${this.#_base}/v${this.#_version}`,
      headers: {
        'User-Agent': this.#user_agent,
      },
    });
  }

  /*
   **			SYSTEM FUNCTIONS
   */

  async getSystem(data: GetSystemOptions = {}) {
    const token = this.#token ?? data.token;
    if (data.system == null && !token) throw new Error('Must provide a token or ID.');
    let sys;
    let resp;
    try {
      if (token) {
        resp = await this.handle(ROUTES[this.#_version].GET_OWN_SYSTEM(), { token });
        sys = new System(this, resp.data);
      } else {
        if (data.system!.length > 5) resp = await this.handle(ROUTES[this.#_version].GET_ACCOUNT(data.system));
        else resp = await this.handle(ROUTES[this.#_version].GET_SYSTEM(data.system!));
        sys = new System(this, resp.data);
      }

      if (data.fetch) {
        if (data.fetch.includes(SystemFetchOptions.Members)) sys.members = await sys.getMembers(token);
        if (data.fetch.includes(SystemFetchOptions.Fronters)) sys.fronters = await sys.getFronters(token);
        if (data.fetch.includes(SystemFetchOptions.Switches)) sys.switches = await sys.getSwitches(token, data.raw);
        if (data.fetch.includes(SystemFetchOptions.Groups)) sys.groups = await sys.getGroups(token);
        if (data.fetch.includes(SystemFetchOptions.Config)) sys.config = await sys.getSettings(token);
      }
    } catch (e) {
      throw e;
    }

    return sys;
  }

  async getAccount(data: GetSystemOptions = {}) {
    return await this.getSystem(data);
  }

  async patchSystem(data: System | Partial<System> = {}) {
    let token = this.#token ?? data.token;
    if (!token) throw new Error('PATCH requires a token.');

    let resp;
    try {
      let sys = data instanceof System ? data : new System(this, data);
      let body = await sys.verify();
      resp = await this.handle(ROUTES[this.#_version].PATCH_SYSTEM(), { token, body });
      return new System(this, resp.data);
    } catch (e) {
      throw e;
    }
  }

  async getSystemConfig(data: RequestOptions = {}) {
    if (this.version < 2) throw new Error('System settings are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('Getting system settings requires a token.');

    try {
      let resp = await this.handle(ROUTES[this.#_version].GET_SYSTEM_CONFIG(), { token });
      return new SystemConfig(this, resp.data);
    } catch (e) {
      throw e;
    }
  }

  async patchSystemConfig(data: RequestData<ISystemConfig>) {
    if (this.version < 2) throw new Error('System settings are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('PATCH requires a token.');

    try {
      let settings = data instanceof SystemConfig ? data : new SystemConfig(this, data);
      let body = await settings.verify();
      let resp = await this.handle(
        ROUTES[this.#_version].PATCH_SYSTEM_CONFIG(),
        { token, body },
      );
      return new SystemConfig(this, resp.data);
    } catch (e) {
      throw e;
    }
  }

  async getSystemGuildSettings(data: { token?: string; guild: string }) {
    if (this.version < 2) throw new Error('Guild settings are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('Getting guild settings requires a token.');
    if (!data.guild) throw new Error('Must provide a guild ID.');

    try {
      let resp = await this.handle(ROUTES[this.#_version].GET_SYSTEM_GUILD_SETTINGS(data.guild), { token });
      return new SystemGuildSettings(this, { ...resp.data, guild: data.guild });
    } catch (e) {
      throw e;
    }
  }

  async patchSystemGuildSettings(data: RequestData<ISystemGuildSettings>) {
    if (this.version < 2) throw new Error('Guild settings are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('PATCH requires a token.');
    if (!data.guild) throw new Error('Must provide a guild ID.');

    try {
      let settings = data instanceof SystemGuildSettings ? data : new SystemGuildSettings(this, data);
      let body = await settings.verify();
      let resp = await this.handle(
        ROUTES[this.#_version].PATCH_SYSTEM_GUILD_SETTINGS(data.guild),
        { token, body },
      );
      return new SystemGuildSettings(this, { ...resp.data, guild: data.guild });
    } catch (e) {
      throw e;
    }
  }

  async getSystemAutoproxySettings(data: { token?: string; guild: string }) {
    if (this.version < 2) throw new Error('Autoproxy settings are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('Getting autoproxy settings requires a token.');
    if (!data.guild) throw new Error('Must provide a guild ID.');

    try {
      let resp = await this.handle(ROUTES[this.#_version].GET_SYSTEM_AUTOPROXY_SETTINGS(data.guild), { token });
      return new SystemAutoproxySettings(this, { ...resp.data, guild: data.guild });
    } catch (e) {
      throw e;
    }
  }

  async patchSystemAutoproxySettings(data: RequestData<ISystemAutoproxySettings>) {
    if (this.version < 2) throw new Error('Autoproxy settings are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('PATCH requires a token.');
    if (!data.guild) throw new Error('Must provide a guild ID.');

    try {
      let settings = data instanceof SystemAutoproxySettings ? data : new SystemAutoproxySettings(this, data);
      let body = await settings.verify();
      let resp = await this.handle(
        ROUTES[this.#_version].PATCH_SYSTEM_AUTOPROXY_SETTINGS(data.guild),
        { token, body },
      );
      return new SystemAutoproxySettings(this, { ...resp.data, guild: data.guild });
    } catch (e) {
      throw e;
    }
  }

  /*
   **			MEMBER FUNCTIONS
   */

  async createMember(data: RequestData<Partial<IMember>>) {
    let token = this.#token || data.token;
    if (!token) throw new Error('POST requires a token.');

    try {
      let mem = new Member(this, data);
      let body = await mem.verify();
      let resp = await this.handle(ROUTES[this.#_version].ADD_MEMBER(), { token, body });
      return new Member(this, resp.data);
    } catch (e) {
      throw e;
    }
  }

  async getMember(data: { token?: string; member: string }) {
    if (data.member == null) throw new Error('Must provide a member ID.');
    let token = this.#token || data.token;
    try {
      let resp = await this.handle(ROUTES[this.#_version].GET_MEMBER(data.member), { token });
      return new Member(this, resp.data);
    } catch (e) {
      throw e;
    }
  }

  async getMembers(data: { token?: string; system: string }) {
    let token = this.#token || data.token;
    let system = data.system ?? '@me';
    try {
      let resp = await this.handle(ROUTES[this.#_version].GET_MEMBERS(system), { token });
      let mems = resp.data.map((m: IMember) => [m.id, new Member(this, m)]);
      return new Map<string, Member>(mems);
    } catch (e) {
      throw e;
    }
  }

  async patchMember(data: RequestData<Partial<IMember> & { member: string }>) {
    if (data.member == null) throw new Error('Must provide a member ID.');
    let token = this.#token || data.token;
    if (!token) throw new Error('PATCH requires a token.');

    try {
      let mem = data instanceof Member ? data : new Member(this, data);
      let body = await mem.verify();
      let resp = await this.handle(ROUTES[this.#_version].PATCH_MEMBER(data.member), { token, body });
      return new Member(this, resp.data);
    } catch (e) {
      throw e;
    }
  }

  async deleteMember(data: { token?: string; member: string }) {
    if (data.member == null) throw new Error('Must provide a member ID.');
    let token = this.#token || data.token;
    if (!token) throw new Error('DELETE requires a token.');
    try {
      let resp = await this.handle(ROUTES[this.#_version].DELETE_MEMBER(data.member), { token });
    } catch (e) {
      throw e;
    }

    return null;
  }

  async getMemberGroups(data: { token?: string; member: string }) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    let token = this.#token || data.token;
    if (!data.member) throw new Error('Must provide a member ID.');

    try {
      let resp = await this.handle(
        ROUTES[this.#_version].GET_MEMBER_GROUPS(data.member),
        { token },
      );
      let groups = resp.data.map((g: IGroup) => [g.id, new Group(this, g)]);
      return new Map<string, Group>(groups);
    } catch (e) {
      throw e;
    }
  }

  async addMemberGroups(data: {
    token?: string;
    member: string;
    groups: string[] | Group[];
  }) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('POST requires a token.');
    if (!data.member) throw new Error('Must provide a member ID.');
    if (!data.groups || !Array.isArray(data.groups)) {
      throw new Error('Must provide an array of groups.');
    }
    let groups = data.groups;
    groups = groups.map((g) => g instanceof Group ? g.id : g);

    try {
      let resp = await this.handle(
        ROUTES[this.#_version].ADD_MEMBER_GROUPS(data.member),
        { token, body: groups },
      );
    } catch (e) {
      throw e;
    }

    return;
  }

  async removeMemberGroups(data: {
    token?: string;
    member: string;
    groups: string[] | Group[];
  }) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('POST requires a token.');
    if (!data.member) throw new Error('Must provide a member ID.');
    if (!data.groups || !Array.isArray(data.groups)) {
      throw new Error('Must provide an array of groups.');
    }
    let groups = data.groups;
    groups = groups.map((g) => g instanceof Group ? g.id : g);

    try {
      let resp = await this.handle(
        ROUTES[this.#_version].REMOVE_MEMBER_GROUPS(data.member),
        { token, body: groups },
      );
    } catch (e) {
      throw e;
    }

    return;
  }

  async setMemberGroups(data: {
    token?: string;
    member: string;
    groups: string[] | Group[];
  }) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('POST requires a token.');
    if (!data.member) throw new Error('Must provide a member ID.');
    if (!data.groups || !Array.isArray(data.groups)) {
      throw new Error('Must provide an array of groups.');
    }
    let groups = data.groups;
    groups = groups.map((g) => g instanceof Group ? g.id : g);

    try {
      let resp = await this.handle(
        ROUTES[this.#_version].SET_MEMBER_GROUPS(data.member),
        { token, body: groups },
      );
    } catch (e) {
      throw e;
    }

    return;
  }

  async getMemberGuildSettings(data: {
    token?: string;
    member: string;
    guild: string;
  }) {
    if (this.version < 2) throw new Error('Guild settings are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('Getting guild settings requires a token.');
    if (!data.member) throw new Error('Must provide a member ID.');
    if (!data.guild) throw new Error('Must provide a guild ID.');

    try {
      let resp = await this.handle(
        ROUTES[this.#_version].GET_MEMBER_GUILD_SETTINGS(data.member, data.guild),
        { token },
      );
      return new MemberGuildSettings(this, { ...resp.data, guild: data.guild, member: data.member });
    } catch (e) {
      throw e;
    }
  }

  async patchMemberGuildSettings(data: RequestData<Partial<IMemberGuildSettings>>) {
    if (this.version < 2) throw new Error('Guild settings are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('Getting guild settings requires a token.');
    if (!data.member) throw new Error('Must provide a member ID.');
    if (!data.guild) throw new Error('Must provide a guild ID.');

    try {
      let settings = data instanceof MemberGuildSettings ? data : new MemberGuildSettings(this, data);
      let body = await settings.verify();
      let resp = await this.handle(
        ROUTES[this.#_version].PATCH_MEMBER_GUILD_SETTINGS(data.member, data.guild),
        { token, body },
      );
      return new MemberGuildSettings(this, { ...resp.data, guild: data.guild, member: data.member });
    } catch (e) {
      throw e;
    }
  }

  /*
   **			GROUP FUNCTIONS
   */

  async createGroup(data: RequestData<Partial<IGroup>>) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('POST requires a token.');

    try {
      let group = new Group(this, data);
      let body = await group.verify();
      let resp = await this.handle(ROUTES[this.#_version].ADD_GROUP(), { token, body });
      return new Group(this, resp.data);
    } catch (e) {
      throw e;
    }
  }

  async getGroups(data: { token?: string; system?: string }) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    let token = this.#token || data.token;
    let system = data.system ?? '@me';

    try {
      let resp = await this.handle(ROUTES[this.#_version].GET_GROUPS(system), { token });
      let groups = resp.data.map((g: IGroup) => [g.id, new Group(this, g)]);
      return new Map<string, Group>(groups);
    } catch (e) {
      throw e;
    }
  }

  async getGroup(data: {
    token?: string;
    group: string;
    fetch_members?: boolean;
  }) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    let token = this.#token || data.token;
    if (!data.group) throw new Error('Must provide group ID.');

    try {
      let resp = await this.handle(ROUTES[this.#_version].GET_GROUP(data.group), { token });
      let group = new Group(this, resp.data);

      if (data.fetch_members) group.members = await group.getMembers();
      return group;
    } catch (e) {
      throw e;
    }
  }

  async patchGroup(data: RequestData<Partial<IGroup> & { group: string }>) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    if (data.group == null) throw new Error('Must provide a group ID.');
    let token = this.#token || data.token;
    if (!token) throw new Error('PATCH requires a token.');

    try {
      let group = data instanceof Group ? data : new Group(this, data);
      let body = await group.verify();
      let resp = await this.handle(ROUTES[this.#_version].PATCH_GROUP(data.group), { token, body });
      return new Group(this, resp.data);
    } catch (e) {
      throw e;
    }
  }

  async deleteGroup(data: { token?: string; group: string }) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    if (data.group == null) throw new Error('Must provide a group ID.');
    let token = this.#token || data.token;
    if (!token) throw new Error('DELETE requires a token.');

    try {
      await this.handle(ROUTES[this.#_version].DELETE_GROUP(data.group), { token });
    } catch (e) {
      throw e;
    }

    return;
  }

  async getGroupMembers(data: { token?: string; group: string }) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    let token = this.#token || data.token;
    if (!data.group) throw new Error('Must provide a group ID.');

    try {
      let resp = await this.handle(ROUTES[this.#_version].GET_GROUP_MEMBERS(data.group));
      let mems = resp.data.map((m: IMember) => [m.id, new Member(this, m)]);
      return new Map<string, Member>(mems);
    } catch (e) {
      throw e;
    }
  }

  async addGroupMembers(data: {
    token?: string;
    group: string;
    members: string[] | Member[];
  }) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('POST requires a token.');
    if (!data.group) throw new Error('Must provide a group ID.');
    if (!data.members || !Array.isArray(data.members)) {
      throw new Error('Must provide an array of members.');
    }
    let members = data.members;
    members = members.map((m) => m instanceof Member ? m.id : m);

    try {
      let resp = await this.handle(
        ROUTES[this.#_version].ADD_GROUP_MEMBERS(data.group),
        { token, body: members },
      );
    } catch (e) {
      throw e;
    }

    return;
  }

  async removeGroupMembers(data: {
    token?: string;
    group: string;
    members: string[] | Member[];
  }) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('POST requires a token.');
    if (!data.group) throw new Error('Must provide a group ID.');
    if (!data.members || !Array.isArray(data.members)) {
      throw new Error('Must provide an array of members.');
    }
    let members = data.members;
    members = members.map((m) => m instanceof Member ? m.id : m);

    try {
      let resp = await this.handle(
        ROUTES[this.#_version].REMOVE_GROUP_MEMBERS(data.group),
        { token, body: members },
      );
    } catch (e) {
      throw e;
    }

    return;
  }

  async setGroupMembers(data: {
    token?: string;
    group: string;
    members: string[] | Member[];
  }) {
    if (this.version < 2) throw new Error('Groups are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('POST requires a token.');
    if (!data.group) throw new Error('Must provide a group ID.');
    if (!data.members || !Array.isArray(data.members)) {
      throw new Error('Must provide an array of members.');
    }
    let members = data.members;
    members = members.map((m) => m instanceof Member ? m.id : m);

    try {
      let resp = await this.handle(
        ROUTES[this.#_version].SET_GROUP_MEMBERS(data.group),
        { token, body: members },
      );
    } catch (e) {
      throw e;
    }

    return;
  }

  /*
   **			SWITCH FUNCTIONS
   */

  async createSwitch(data: RequestData<Partial<ISwitch>>) {
    let token = this.#token || data.token;
    if (!token) throw new Error('POST requires a token.');

    let body: {
      members: string[];
    } = {
      members: [],
    };

    if (data.members) {
      if (Array.isArray(data.members)) {
        body.members = data.members;
      } else {
        body.members = Object.values(data.members).map((m: IMember) => m.id);
      }
    }
    try {
      let resp = await this.handle(ROUTES[this.#_version].ADD_SWITCH(), { token, body });
      if (this.#_version < 2) return;

      return new Switch(this, {
        ...resp.data,
        members: new Map(resp.data.members.map((m: IMember) => [m.id, new Member(this, m)])),
      });
    } catch (e) {
      throw e;
    }
  }

  async getSwitches(data: {
    token?: string;
    system?: string;
    raw?: boolean;
  }) {
    let system = data.system ?? '@me';
    let token = this.#token || data.token;
    let switches = [];
    let resp;
    try {
      resp = await this.handle(ROUTES[this.#_version].GET_SWITCHES(system), { token });
      if (!data.raw) {
        let memb_resp = await this.handle(ROUTES[this.#_version].GET_MEMBERS(system), { token });
        let membs = new Map(memb_resp.data.map((m: IMember) => [m.id, new Member(this, m)]));
        for (let s of resp.data) {
          let members = new Map();
          for (let m of s.members) if (membs.get(m)) members.set(m, membs.get(m));
          s.members = members;
          switches.push(new Switch(this, s));
        }
      }
    } catch (e) {
      throw e;
    }

    if (data.raw) {
      switches = resp.data.map((s: ISwitch) => new Switch(this, s));
    }

    if (this.#_version < 2) return switches;
    else return new Map(switches.map((s: ISwitch) => [s.id, s]));
  }

  async getSwitch(data: {
    token?: string;
    system?: string;
    switch: string;
  }) {
    if (this.version < 2) throw new Error('Individual switches are only available for API version 2.');

    let token = this.#token || data.token;
    let system = data.system ?? '@me';
    if (!data.switch) throw new Error('Must provide a switch ID.');

    try {
      let resp = await this.handle(ROUTES[this.#_version].GET_SWITCH(system, data.switch));
      return new Switch(this, {
        ...resp.data,
        members: new Map(resp.data.members.map((m: IMember) => [m.id, new Member(this, m)])),
      });
    } catch (e) {
      throw e;
    }
  }

  async getFronters(data: {
    token?: string;
    system?: string;
  }) {
    let token = this.#token || data.token;
    let system = data.system ?? '@me';
    try {
      let resp = await this.handle(ROUTES[this.#_version].GET_FRONTERS(system), { token });
      return new Switch(this, {
        ...resp.data,
        members: new Map(resp.data.members.map((m: IMember) => [m.id, new Member(this, m)])),
      });
    } catch (e) {
      throw e;
    }
  }

  async patchSwitchTimestamp(data: {
    token?: string;
    switch: string;
    timestamp: string | Date;
  }) {
    if (this.version < 2) throw new Error('Individual switches are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('PATCH requires a token.');
    if (!data.switch) throw new Error('Must provide a switch ID.');
    if (!data.timestamp) throw new Error('Must provide a timestamp.');

    try {
      let sw = await this.handle(ROUTES[this.#_version].PATCH_SWITCH(data.switch), {
        token,
        body: { timestamp: data.timestamp },
      });
      return new Switch(this, {
        ...sw.data,
        members: new Map(sw.data.members.map((m: IMember) => [m.id, new Member(this, m)])),
      });
    } catch (e) {
      throw e;
    }
  }

  async patchSwitchMembers(data: {
    token?: string;
    switch: string;
    members?: string[];
  }) {
    if (this.version < 2) throw new Error('Individual switches are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('PATCH requires a token.');
    if (!data.switch) throw new Error('Must provide a switch ID.');

    try {
      let s = data instanceof Switch ? data : new Switch(this, data);
      let sv = await s.verify();
      if (sv.members && !Array.isArray(sv.members)) {
        throw new Error('Members must be an array or map if provided.');
      }

      let sw = await this.handle(ROUTES[this.#_version].PATCH_SWITCH_MEMBERS(data.switch), {
        token,
        body: sv.members ?? [],
      });
      return new Switch(this, {
        ...sw.data,
        members: new Map(sw.data.members.map((m: IMember) => [m.id, new Member(this, m)])),
      });
    } catch (e) {
      throw e;
    }
  }

  async deleteSwitch(data: {
    token?: string;
    switch: string;
  }) {
    if (this.version < 2) throw new Error('Individual switches are only available for API version 2.');

    let token = this.#token || data.token;
    if (!token) throw new Error('DELETE requires a token.');
    if (!data.switch) throw new Error('Must provide a switch ID.');

    try {
      await this.handle(ROUTES[this.#_version].DELETE_SWITCH(data.switch));
    } catch (e) {
      throw e;
    }

    return;
  }

  /*
   ** 			MISC FUNCTIONS
   */

  async getMessage(data: {
    token?: string;
    message: string;
  }) {
    if (data.message == null) throw new Error('Must provide a message ID.');
    let token = this.#token || data.token;
    try {
      let resp = await this.handle(ROUTES[this.#_version].GET_MESSAGE(data.message), { token });
      return new Message(this, resp.data);
    } catch (e) {
      throw e;
    }
  }

  /*
   **			BASE STUFF
   */

  async handle(path: any, options?: {
    token?: string;
    headers?: any;
    body?: any;
  }) {
    let { route, method } = path;
    let headers = options?.headers || {};
    let request: {
      method?: any;
      headers?: any;
      data?: any;
    } = { method, headers };
    let token = this.#token || options?.token;
    if (token) request.headers['Authorization'] = token;

    if (options?.body) {
      request.headers['content-type'] = 'application/json';
      request.data = JSON.stringify(options.body);
    }

    if (this.version == 1 && !this.#version_warning) {
      console.warn(
        'WARNING: API version 1 is considered officially deprecated. ' +
          'Support for this API version may be removed from this wrapper ' +
          'in a future version. Some methods may not fully work for v1 as well. ' +
          'USE v1 at your own risk!',
      );
      this.#version_warning = true;
    }

    try {
      return await this.#inst(route, request);
    } catch (e: any) {
      throw new APIError(this, e.response);
    }
  }

  set base_url(s) {
    this.#_base = s;
    this.#inst.defaults.baseURL = `${this.#_base}/v${this.#_version}`;
  }

  get base_url() {
    return this.#_base;
  }

  set version(n) {
    this.#_version = n;
    this.#inst.defaults.baseURL = `${this.#_base}/v${this.#_version}`;
  }

  get version() {
    return this.#_version;
  }

  set token(t) {
    this.#token = t;
  }

  get token() {
    return this.#token;
  }

  get user_agent() {
    return this.#user_agent;
  }

  set user_agent(s) {
    this.#user_agent = s;
    this.#inst.defaults.headers['User-Agent'] = s;
  }
}

export default PKAPI;
export {
  APIError,
  Group,
  Member,
  MemberGuildSettings,
  Message,
  PKAPI,
  Switch,
  System,
  SystemConfig,
  SystemGuildSettings,
};

export type { IGroup, IMember, IMemberGuildSettings, IMessage, ISwitch, ISystem, ISystemConfig, ISystemGuildSettings };
