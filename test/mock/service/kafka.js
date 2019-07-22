'use strict';

const { inspect } = require('util');

class MockKafkaServie {
  static async send(payloads) {
    console.info(`sent ${inspect(payloads)}`);
    return true;
  }
}

module.exports = () => MockKafkaServie;
