'use strict';

module.exports = app => {
  const config = exports = {};

  config.keys = app.name + '_1531120004380_4501';

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
      db: 0,
    },
  };

  config.mongoose = {
    client: {
      url: 'mongodb://host/dbname',
      options: {
        user: 'example',
        pass: '123456',
        useNewUrlParser: true,
      },
    },
  };

  config.gitlab = {
    url: 'https://git.xxx.com',
    admin_token: 'testtoken',
    account_prifix: 'gitlab_www_',
    email_postfix: '@paraengine.com',
  };

  return config;
};
