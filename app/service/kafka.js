'use strict';

const Service = require('egg').Service;
const { KafkaClient, HighLevelProducer } = require('kafka-node');
const { promisify, inspect } = require('util');

let Client;
let Producer;
let promisified_send;
let initialized = false;

class KafkaService extends Service {
  async send(payloads) {
    if (!initialized) {
      await this.refreshMetadata();
      initialized = true;
    }
    if (!promisified_send) {
      const { producer } = this;
      promisified_send = promisify(producer.send.bind(producer));
    }
    if (!(payloads instanceof Array)) payloads = [ payloads ];
    return promisified_send(payloads).then(result => {
      this.app.logger.info(`Successfully sent messages to ${inspect(result)}`);
      return result;
    });
  }

  get client() {
    if (!Client) {
      Client = new KafkaClient(this.config.kafka.client);
    }
    return Client;
  }

  get producer() {
    if (!Producer) {
      const options = this.config.kafka.producer;
      Producer = new HighLevelProducer(this.client, options);
      this.onError();
      this.onReady();
    }
    return Producer;
  }

  async refreshMetadata() {
    const topics = Object.values(this.config.kafka.topics);
    const { client } = this;
    await promisify(client.refreshMetadata.bind(client))(topics);
  }

  onReady() {
    Producer.on('ready', () => {
      this.app.logger.info('Successfully connect to kafka');
    });
  }

  onError() {
    Producer.on('error', err => {
      this.app.logger.error('Fail to connect to kafka');
      this.app.logger.error(err);
    });
  }
}

module.exports = KafkaService;
