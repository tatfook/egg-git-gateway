'use strict';

module.exports = app => {
  const { mockAxios, config } = app;
  const baseUrl = config.keepwork.url;
  const url = new RegExp(`${baseUrl}/*`);

  class MockKeepworkCalling {
    static setOnce(status, body) {
      mockAxios.onAny(url).replyOnce(status, body);
    }

    static set(status, body) {
      mockAxios.onAny(url).reply(status, body);
    }
  }

  return MockKeepworkCalling;
};
