'use strict';

module.exports = appInfo => {
  const config = exports = {};

  config.keys = appInfo.name;

  config.security = {
    csrf: {
      enable: false,
    },
  };

  config.redis = {
    client: {
      port: 6379,
      host: 'localhost',
      password: '123456',
      db: 1,
    },
  };

  config.mongoose = {
    client: {
      url: 'mongodb://xx.xx.xx.xx:27017/keepwork',
      options: {
        user: 'gitGateway',
        pass: '123456',
        useNewUrlParser: true,
      },
    },
  };

  config.gitlab = {
    url: 'http://localhost:xxxx',
    admin_token: '123456',
    account_prifix: 'gitlab_www_',
    email_postfix: '@paraengine.com',
  };

  config.jwt = {
    secret: '123456',
  };

  config.keepwork = {
    baseURL: 'http://localhost:xxxx',
  };

  return config;
};
