import API from '../mod.ts';

import axios from 'npm:axios';
import validUrl from 'npm:valid-url';

const KEYS: any = {
  guild: {},
  member: {},
  display_name: {
    test: (s: string) => s.length <= 100,
    err: 'Display name must be 100 characters or less',
  },
  avatar_url: {
    test: async (a: string) => {
      if (!validUrl.isWebUri(a)) return false;
      try {
        let data = await axios.head(a);
        if (data.headers['content-type']?.startsWith('image')) return true;
        return false;
      } catch (e) {
        return false;
      }
    },
    err: 'Avatar URL must be a valid image and less than 256 characters',
  },
  keep_proxy: {
    transform: (v?: any) => v ? true : false,
  },
};

export interface IMemberGuildSettings {
  [key: string]: any;

  guild: string;
  member: string;
  display_name?: string;
  avatar_url?: string;
  keep_proxy?: boolean;
}

export default class MemberGuildSettings implements IMemberGuildSettings {
  [key: string]: any;

  #api: API;
  guild = '';
  member = '';
  display_name?: string;
  avatar_url?: string;
  keep_proxy?: boolean;

  constructor(api: API, data: Partial<MemberGuildSettings>) {
    this.#api = api;
    for (let k in data) {
      if (KEYS[k]) {
        if (KEYS[k].init) data[k] = KEYS[k].init(data[k]);
        this[k] = data[k];
      }
    }
  }

  async patch(token?: string) {
    let data = await this.#api.patchMemberGuildSettings({ ...this, token });
    for (let k in data) if (KEYS[k]) this[k] = data[k];
    return this;
  }

  async verify() {
    let settings: Partial<MemberGuildSettings> = {};
    let errors = [];
    for (let k in KEYS) {
      let test = true;
      if (this[k] == null) {
        settings[k] = this[k];
        continue;
      }
      if (this[k] == undefined) continue;

      if (KEYS[k].test) test = await KEYS[k].test(this[k]);
      if (!test) {
        errors.push(KEYS[k].err);
        continue;
      }
      if (KEYS[k].transform) this[k] = KEYS[k].transform(this[k]);
      settings[k] = this[k];
    }

    if (errors.length) throw new Error(errors.join('\n'));

    return settings;
  }
}
