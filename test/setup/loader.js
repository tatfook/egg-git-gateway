'use strict';

const loadMockAxios = require('./mock-axios');
const loadFactory = require('./factory');
const loadMockUtils = require('./utils');
const loadMockService = require('./service');

const loadMockTools = app => {
  app.mock = app.mock || {};
  loadMockAxios(app);
  loadFactory(app);
  loadMockUtils(app);
  loadMockService(app);
};

module.exports = loadMockTools;
