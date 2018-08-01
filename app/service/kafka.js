'use strict';

const Service = require('egg').Service;
const { KafkaClient } = require('kafka-node');

let Client;

class KafkaService extends Service {
  get client() {
    if (!Client) {
      const KEEPWORK_CONFIG = this.config.kafka;
      Client = new KafkaClient(KEEPWORK_CONFIG.client);
    }
    return Client;
  }
}

module.exports = KafkaService;
