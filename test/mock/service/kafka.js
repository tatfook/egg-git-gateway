'use strict';

class MockKafkaServie {
  static async send(payloads) {
    for (const message of payloads) {
      console.info(`sent message to ${message.topic}: ${message.key}`);
    }
    return true;
  }
}

module.exports = () => MockKafkaServie;
