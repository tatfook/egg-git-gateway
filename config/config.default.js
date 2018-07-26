'use strict';

const error_handler = require('./error_handler');

module.exports = () => {
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

  return config;
};
