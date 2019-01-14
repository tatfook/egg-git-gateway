'use strict';

const Service = require('egg').Service;
const { KafkaClient, HighLevelProducer } = require('kafka-node');
const { promisify, inspect } = require('util');

let Client;
let Producer;
let promisified_send;
let initialized = false;

class KafkaService extends Service {
  constructor(ctx) {
    super(ctx);
    this.init_client();
    this.init_producer();
  }

  async send(payloads) {
    if (!initialized) {
      await this.refresh_metadata();
      initialized = true;
    }
    if (!promisified_send) {
      promisified_send = promisify(Producer.send.bind(Producer));
    }
    if (!(payloads instanceof Array)) { payloads = [ payloads ]; }
    return promisified_send(payloads).then(result => {
      this.app.logger.info(`Successfully sent messages to ${inspect(result)}`);
      return result;
    });
  }

  wrap_commit_message(message, key) {
    return {
      topic: this.config.kafka.topics.commit,
      messages: message,
      key,
    };
  }

  wrap_elasticsearch_message(message, key) {
    return {
      topic: this.config.kafka.topics.elasticsearch,
      messages: message,
      key,
    };
  }

  init_client() {
    if (!Client) {
      Client = new KafkaClient(this.config.kafka.client);
    }

    this.client = Client;
  }

  init_producer() {
    if (!Producer) {
      const options = this.config.kafka.producer;
      Producer = new HighLevelProducer(Client, options);
      this.on_error();
      this.on_ready();
    }
    this.producer = Producer;
  }

  async refresh_metadata() {
    const topics = Object.values(this.config.kafka.topics);
    await promisify(Client.refreshMetadata.bind(Client))(topics)
      .catch(err => {
        this.app.logger.error(err);
      });
  }

  on_ready() {
    Producer.on('ready', () => {
      this.app.logger.info('Successfully connect to kafka');
    });
  }

  on_error() {
    Producer.on('error', err => {
      this.app.logger.error('Fail to connect to kafka');
      this.app.logger.error(err);
    });
  }
}

module.exports = KafkaService;
