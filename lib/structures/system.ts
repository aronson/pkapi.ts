import API from '../mod.ts';

import tc from 'npm:tinycolor2';
import axios from 'npm:axios';
import validUrl from 'npm:valid-url';
import { validatePrivacy } from '../utils.ts';

import Member from './member.ts';
import Group from './group.ts';
import Switch from './switch.ts';
import SystemConfig from './systemConfig.ts';
import SystemGuildSettings from './systemGuildSettings.ts';
import SystemAutoproxyConfig from './systemAutoproxySettings.ts';

export const enum SystemPrivacyKeys {
  Description = 'description_privacy',
  Pronouns = 'pronoun_privacy',
  MemberList = 'member_list_privacy',
  GroupList = 'group_list_privacy',
  Front = 'front_privacy',
  FrontHistory = 'front_history_privacy',
}

const pKeys = [
  SystemPrivacyKeys.Description,
  SystemPrivacyKeys.Pronouns,
  SystemPrivacyKeys.MemberList,
  SystemPrivacyKeys.GroupList,
  SystemPrivacyKeys.Front,
  SystemPrivacyKeys.FrontHistory,
];

export interface SystemPrivacy {
  description_privacy?: string;
  pronoun_privacy?: string;
  member_list_privacy?: string;
  group_list_privacy?: string;
  front_privacy?: string;
  front_history_privacy?: string;
}

const KEYS: any = {
  id: {},
  uuid: {},
  name: {
    test: (n: string) => !n.length || n.length <= 100,
    err: 'Name must be 100 characters or less',
  },
  description: {
    test: (d: string) => !d.length || d.length < 1000,
    err: 'Description must be 1000 characters or less',
  },
  tag: {},
  pronouns: {},
  avatar_url: {
    test: async (a: string) => {
      if (!validUrl.isWebUri(a)) return false;
      try {
        const data = await axios.head(a);
        if (data.headers['content-type']?.startsWith('image')) return true;
        return false;
      } catch (_) {
        return false;
      }
    },
    err: 'Avatar URL must be a valid image and less than 256 characters',
  },
  banner: {
    test: async (a: string) => {
      if (!validUrl.isWebUri(a)) return false;
      try {
        const data = await axios.head(a);
        if (data.headers['content-type']?.startsWith('image')) return true;
        return false;
      } catch (_) {
        return false;
      }
    },
    err: 'Banner URL must be a valid image and less than 256 characters',
  },
  color: {
    test: (c: string) => {
      const cc = tc(c);
      return cc.isValid();
    },
    err: 'Color must be a valid hex code',
    transform: (c: string) => {
      const cc = tc(c);
      return cc.toHex();
    },
  },
  created: {
    init: (d: Date | string) => new Date(d),
  },
  privacy: {
    transform: (o: Partial<SystemPrivacy>) => validatePrivacy(pKeys, o),
  },
};

export interface ISystem {
  id: string;
  uuid: string;
  name?: string;
  description?: string;
  tag?: string;
  pronouns?: string;
  avatar_url?: string;
  banner?: string;
  color?: string;
  created: Date | string;
  privacy?: SystemPrivacy;

  members?: Map<string, Member>;
  groups?: Map<string, Group>;
  fronters?: Switch;
  switches?: Map<string, Switch>;
  settings?: Map<string, SystemGuildSettings>;
  config?: SystemConfig;
  autoproxySettings?: Map<string, SystemAutoproxyConfig>;
}

export default class System implements ISystem {
  [key: string]: any;

  #api: API;

  id: string = '';
  uuid: string = '';
  name?: string;
  description?: string;
  tag?: string;
  pronouns?: string;
  avatar_url?: string;
  banner?: string;
  color?: string;
  created: Date | string = '';
  privacy?: SystemPrivacy;

  members?: Map<string, Member>;
  groups?: Map<string, Group>;
  fronters?: Switch;
  switches?: Map<string, Switch>;
  settings?: Map<string, SystemGuildSettings>;
  config?: SystemConfig;
  autoproxySettings?: Map<string, SystemAutoproxyConfig>;

  constructor(api: API, data: Partial<System>) {
    this.#api = api;
    for (const k in data) {
      if (KEYS[k]) {
        if (KEYS[k].init) data[k] = KEYS[k].init(data[k]);
        this[k] = data[k];
      }
    }
  }

  async patch(token?: string) {
    const data = await this.#api.patchSystem({ system: this.id, ...this, token });
    for (const k in data) if (KEYS[k]) this[k] = data[k];
    return this;
  }

  async createMember(data: Partial<Member>) {
    const mem = await this.#api.createMember(data);
    if (!this.members) this.members = new Map();
    this.members.set(mem.id, mem);
    return mem;
  }

  async getMember(member: string, token?: string) {
    const mem = await this.#api.getMember({ member, token });
    if (!this.members) this.members = new Map();
    this.members.set(mem.id, mem);
    return mem;
  }

  async getMembers(token?: string) {
    const mems = await this.#api.getMembers({ system: this.id, token });
    this.members = mems;
    return mems;
  }

  async deleteMember(member: string, token?: string) {
    await this.#api.deleteMember({ member, token });
    if (this.members) this.members.delete(member);
    return;
  }

  async createGroup(data: Partial<Group>) {
    const group = await this.#api.createGroup(data);
    if (!this.groups) this.groups = new Map();
    this.groups.set(group.id, group);
    return group;
  }

  async getGroups(token?: string) {
    const groups = await this.#api.getGroups({ system: this.id, token });
    this.groups = groups;
    return groups;
  }

  async getGroup(group: string, token?: string) {
    const grp = await this.#api.getGroup({ group, token });
    if (!this.groups) this.groups = new Map<string, Group>();
    this.groups.set(grp.id, grp);
    return grp;
  }

  async deleteGroup(group: string, token?: string) {
    await this.#api.deleteGroup({ group, token });
    if (this.groups) this.groups.delete(group);
    return;
  }

  createSwitch(data: Partial<Switch>) {
    return this.#api.createSwitch(data);
  }

  async getSwitches(token?: string, raw = false) {
    const switches = await this.#api.getSwitches({ system: this.id, token, raw });
    this.switches = switches;
    return switches;
  }

  async getFronters(token?: string) {
    const fronters = await this.#api.getFronters({ system: this.id, token });
    this.fronters = fronters;
    return fronters;
  }

  async deleteSwitch(switchid: string, token?: string) {
    await this.#api.deleteSwitch({ switch: switchid, token });
    if (this.switches) this.switches.delete(switchid);
    return;
  }

  async getConfig(token?: string) {
    const settings = await this.#api.getSystemConfig({ token });
    this.config = settings;
    return settings;
  }

  async getGuildSettings(guild: string, token?: string) {
    const settings = await this.#api.getSystemGuildSettings({ guild, token });
    if (!this.settings) this.settings = new Map();
    this.settings.set(guild, settings);
    return settings;
  }

  async getAutoproxySettings(guild: string, token?: string) {
    const settings = await this.#api.getSystemAutoproxySettings({ guild, token });
    if (!this.autoproxySettings) this.autoproxySettings = new Map();
    this.autoproxySettings.set(guild, settings);
    return settings;
  }

  async verify() {
    const sys: Partial<System> = {};
    const errors = [];
    for (const k in KEYS) {
      let test = true;
      if (this[k] == null) {
        sys[k] = this[k];
        continue;
      }
      if (this[k] == undefined) continue;

      if (KEYS[k].test) test = await KEYS[k].test(this[k]);
      if (!test) {
        errors.push(KEYS[k].err);
        continue;
      }
      if (KEYS[k].transform) this[k] = KEYS[k].transform(this[k]);
      sys[k] = this[k];
    }

    if (errors.length) throw new Error(errors.join('\n'));

    return sys;
  }
}
