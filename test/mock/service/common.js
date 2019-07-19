'use strict';

class MockCommonServie {
  static async success() {
    return true;
  }
}

module.exports = () => MockCommonServie;
