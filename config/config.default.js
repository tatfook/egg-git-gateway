'use strict';

const path = require('path');
const error_handler = require('./error_handler');

module.exports = appInfo => {
  const config = exports = {};

  // add your config here
  config.middleware = [ 'jwt' ];

  // error handler
  config.onerror = error_handler;

  config.file = {
    white_list: [ '__keepwork__' ],
  };

  config.bodyParser = {
    enable: true,
    jsonLimit: '10mb',
    formLimit: '10mb',
  };

  config.permission = {
    r: 32,
    rw: 64,
  };

  config.static = {
    prefix: '/doc/',
    dir: path.join(appInfo.baseDir, 'app/doc'),
  };

  config.security = {
    csrf: {
      enable: false,
    },
  };

  config.cors = {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
  };

  config.cache_expire = 3600;

  return config;
};
