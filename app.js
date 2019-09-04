'use strict';
require('newrelic');

module.exports = app => {
  if (app.config.env !== 'prod') {
    console.log('Newrelic is disabled');
    process.env.NEW_RELIC_ENABLED = false;
  }
};
