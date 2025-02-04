import API from '../mod.ts';

import { rawTimeZones } from 'npm:@vvo/tzdb';

function findTz(t: string) {
  const raw = rawTimeZones.find((z) => {
    return ([
      z.name.toLowerCase(),
      z.abbreviation.toLowerCase(),
      z.alternativeName.toLowerCase(),
    ].includes(t.toLowerCase().replace('utc', 'gmt')));
  });

  return raw;
}

const KEYS: any = {
  timezone: {
    test: (t: string) => findTz(t),
    err: 'Timezone must be valid',
    transform: (t: string) => {
      const raw = findTz(t);
      return raw!.abbreviation.replace('GMT', 'UTC');
    },
  },
  pings_enabled: {
    transform: (v?: any) => v ? true : false,
  },
  latch_timeout: {
    test: (v?: any) => !isNaN(v),
  },
  member_default_private: {
    transform: (v?: any) => v ? true : false,
  },
  group_default_private: {
    transform: (v?: any) => v ? true : false,
  },
  show_private_info: {
    transform: (v?: any) => v ? true : false,
  },
  member_limit: {},
  group_limit: {},
};

export interface ISystemConfig {
  timezone?: string;
  pings_enabled?: boolean;
  latch_timeout?: number;
  member_default_private?: boolean;
  group_default_private?: boolean;
  show_private_info?: boolean;
  member_limit?: number;
  group_limit?: number;
}

export default class SystemConfig implements ISystemConfig {
  [key: string]: any;

  #api: API;

  timezone?: string;
  pings_enabled?: boolean;
  latch_timeout?: number;
  member_default_private?: boolean;
  group_default_private?: boolean;
  show_private_info?: boolean;
  member_limit?: number;
  group_limit?: number;

  constructor(api: API, data: Partial<SystemConfig> = {}) {
    this.#api = api;
    for (const k in data) {
      if (KEYS[k]) {
        if (KEYS[k].init) data[k] = KEYS[k].init(data[k]);
        this[k] = data[k];
      }
    }
  }

  async patch(token?: string) {
    const data = await this.#api.patchSystemConfig({ ...this, token });
    for (const k in data) if (KEYS[k]) this[k] = data[k];
    return this;
  }

  async verify() {
    const config: Partial<SystemConfig> = {};
    const errors = [];
    for (const k in KEYS) {
      let test = true;
      if (this[k] == null) {
        config[k] = this[k];
        continue;
      }
      if (this[k] == undefined) continue;

      if (KEYS[k].test) test = await KEYS[k].test(this[k]);
      if (!test) {
        errors.push(KEYS[k].err);
        continue;
      }
      if (KEYS[k].transform) this[k] = KEYS[k].transform(this[k]);
      config[k] = this[k];
    }

    if (errors.length) throw new Error(errors.join('\n'));

    return config;
  }
}
