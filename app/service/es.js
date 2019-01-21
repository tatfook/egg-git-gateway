'use strict';

const Service = require('egg').Service;
const Axios = require('axios');

module.exports = app => {
  const config = app.config.es;
  const Client = Axios.create({
    baseURL: `${config.url}`,
    headers: { Authorization: config.token },
    timeout: 30 * 1000,
  });

  class EsService extends Service {
    get client() {
      return Client;
    }

    update_site_visibilty(path, visibility) {
      return this.client.put(`/sites/${path}/visibility`, { visibility });
    }

    destroy_site(path) {
      return this.client.delete(`/sites/${path}`);
    }
  }
  return EsService;
};
