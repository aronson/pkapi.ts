import API from '../mod.ts';

export default class APIError {
  api: any;
  status?: string;
  code?: string;
  message?: string;
  statusText?: string;
  headers?: any;

  constructor(api: API, data: any = {}) {
    this.api = {
      baseURL: api.base_url,
      token: api.token,
      version: api.version,
    };
    this.status = data.status || '???';
    this.code = data.data?.code || '???';
    this.message = data.data?.message || 'Unknown error.';
    this.statusText = data.statusText || 'Unknown error.';
    this.headers = data.headers || {};
  }
}
