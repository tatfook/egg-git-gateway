'use strict';

module.exports = appInfo => {
  const config = exports = {};

  config.keys = appInfo.name + '_1531120004380_4501';

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

  return config;
};
