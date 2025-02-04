import API from '../mod.ts';

export enum AutoProxyModes {
  Off = 'off',
  Front = 'front',
  Latch = 'latch',
  Member = 'member',
}

const apVals: string[] = [
  AutoProxyModes.Off,
  AutoProxyModes.Front,
  AutoProxyModes.Latch,
  AutoProxyModes.Member,
];

const KEYS: any = {
  guild: {},
  autoproxy_mode: {
    test: (s?: string) => s && apVals.includes(s),
    err: `Invalid mode provided. Valid autoproxy mode values: ${apVals.join(', ')}`,
  },
  autoproxy_member: {},
  last_latch_timestamp: {
    init: (d: Date | string) => new Date(d),
  },
};

export interface ISystemAutoproxySettings {
  guild: string;
  autoproxy_mode?: AutoProxyModes;
  autoproxy_member?: string;
  last_latch_timestamp?: Date;
}

export default class SystemAutoproxySettings implements ISystemAutoproxySettings {
  [key: string]: any;

  #api: API;

  guild: string = '';
  autoproxy_mode?: AutoProxyModes;
  autoproxy_member?: string;
  last_latch_timestamp?: Date;

  constructor(api: API, data: Partial<SystemAutoproxySettings> = {}) {
    this.#api = api;
    for (const k in data) {
      if (KEYS[k]) {
        if (KEYS[k].init) data[k] = KEYS[k].init(data[k]);
        this[k] = data[k];
      }
    }
  }

  async patch(token?: string) {
    const data = await this.#api.patchSystemAutoproxySettings({ ...this, token });
    for (const k in data) if (KEYS[k]) this[k] = data[k];
    return this;
  }

  async verify() {
    const settings: Partial<SystemAutoproxySettings> = {};
    const errors = [];
    for (const k in KEYS) {
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

    if (settings.autoproxy_mode == 'member' && !settings.autoproxy_member) {
      errors.push('Autoproxy member MUST be supplied if mode is set to "member"');
    }

    if (errors.length) throw new Error(errors.join('\n'));

    return settings;
  }
}
