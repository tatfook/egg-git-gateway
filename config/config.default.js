'use strict';

const error_handler = require('./error_handler');

module.exports = () => {
  const config = exports = {};

  // add your config here
  config.middleware = [];

  // error handler
  config.onerror = error_handler;

  return config;
};
