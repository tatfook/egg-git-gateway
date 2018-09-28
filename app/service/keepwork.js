'use strict';

const Service = require('egg').Service;
const Axios = require('axios');

let Client;

class KeepworkService extends Service {
  get client() {
    if (!Client) {
      const KEEPWORK_CONFIG = this.config.keepwork;
      Client = Axios.create({
        baseURL: KEEPWORK_CONFIG.url,
        timeout: 3 * 1000,
      });
    }
    return Client;
  }

  async ensurePermission(token, site_id, type) {
    try {
      const permission = this.config.permission[type];
      const res = await this.client.get(
        `/sites/${site_id}/privilege`,
        { headers: { Authorization: token } }
      );
      if (res.data >= permission) { return true; }
      return false;
    } catch (err) {
      this.app.logger.error(err);
      throw err;
    }
  }
}

module.exports = KeepworkService;
