import API from '../mod.ts';

import Member from './member.ts';

const KEYS: any = {
  id: {},
  timestamp: {
    init: (t: Date | string) => new Date(t),
    // transform: (d) => d.toISOString()
  },
  members: {
    transform: (mems: Map<string, Member> | Array<string>) => {
      let arr = [];
      if (mems instanceof Map) for (const m of mems.values()) arr.push(m.id ?? m);
      else {arr = mems.map((m: Member | string) => {
          return m instanceof Member ? m.id : m;
        });}
      return arr;
    },
  },
};

export interface ISwitch {
  id: string;
  timestamp: Date | string;
  members?: Map<string, Member> | Array<string>;
}

export default class Switch implements ISwitch {
  [key: string]: any;

  #api;

  id: string = '';
  timestamp: Date | string = '';
  members?: Map<string, Member> | Array<string>;

  constructor(api: API, data: Partial<Switch>) {
    this.#api = api;
    if (!data.timestamp || !data.members) {
      throw new Error('Switch objects require a timestamp and members key');
    }

    for (const k in data) {
      if (KEYS[k]) {
        if (KEYS[k].init) data[k] = KEYS[k].init(data[k]);
        this[k] = data[k];
      }
    }
  }

  async patchTimestamp(timestamp: Date, token?: string) {
    const data = await this.#api.patchSwitchTimestamp({ switch: this.id, timestamp, token });
    for (const k in data) if (KEYS[k]) this[k] = data[k];
    return this;
  }

  async patchMembers(token?: string, members?: Array<string>) {
    const data = await this.#api.patchSwitchMembers({ switch: this.id, members, token });
    for (const k in data) if (KEYS[k]) this[k] = data[k];
    return this;
  }

  async delete(token?: string) {
    return await this.#api.deleteSwitch({ switch: this.id, token });
  }

  async verify() {
    const sw: Partial<Switch> = {};
    const errors = [];
    for (const k in KEYS) {
      if (this[k] == null) {
        sw[k] = this[k];
        continue;
      }
      if (this[k] == undefined) continue;

      let test = true;
      if (KEYS[k].test) test = await KEYS[k].test(this[k]);
      if (!test) {
        errors.push(KEYS[k].err);
      }
      if (KEYS[k].transform) this[k] = KEYS[k].transform(this[k]);
      sw[k] = this[k];
    }

    if (errors.length) throw new Error(errors.join('\n'));

    return sw;
  }
}
