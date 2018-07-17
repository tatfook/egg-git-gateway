'use strict';

const Service = require('egg').Service;
const Axios = require('axios');

class KeepworkService extends Service {
  constructor(ctx) {
    super(ctx);
    const KEEPWORK_CONFIG = this.config.keepwork;
    this.client = Axios.create({
      baseURL: KEEPWORK_CONFIG.baseURL,
      timeout: 3 * 1000,
    });
  }

  async ensurePermission(user_id, site_id, type) {
    try {
      const permission = this.config.permission[type];
      const res = await this.client.get(
        `/sites/${site_id}/getSiteMemberLevel?memberId=${user_id}`
      );
      if (res.data.data >= permission) { return true; }
      return false;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

module.exports = KeepworkService;
