'use strict';

const Service = require('egg').Service;
const Axios = require('axios');

const DEFAULT_TIME_OUT = 30 * 1000;

let Client;

class KeepworkService extends Service {
  get client() {
    if (!Client) {
      const KEEPWORK_CONFIG = this.config.keepwork;
      Client = Axios.create({
        baseURL: KEEPWORK_CONFIG.url,
        timeout: KEEPWORK_CONFIG.timeout || DEFAULT_TIME_OUT,
      });
    }
    return Client;
  }

  async ensurePermission(token, site_id, type) {
    const permission = this.config.permission[type];
    const refuse_code = this.config.permission.reject;
    const res = await this.client.get(
      `/sites/${site_id}/privilege`,
      { headers: { Authorization: token } }
    );
    if (res.data === refuse_code) return false;
    if (res.data >= permission) return true;
    return false;
  }

  async getUserProfile(token) {
    return this.client.get(
      'users/profile',
      { headers: { Authorization: token } }
    );
  }
}

module.exports = KeepworkService;
