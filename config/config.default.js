'use strict';

const path = require('path');
const error_handler = require('./error_handler');

module.exports = appInfo => {
  const config = exports = {};

  // add your config here
  config.middleware = [];

  // error handler
  config.onerror = error_handler;

  config.file = {
    white_list: [ '__keepwork__' ],
  };

  config.permission = {
    r: 32,
    rw: 64,
  };

  config.static = {
    prefix: '/doc/',
    dir: path.join(appInfo.baseDir, 'app/doc'),
  };

  config.cors = {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
  };

  config.cache_expire = 3600;

  return config;
};
