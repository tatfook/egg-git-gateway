'use strict';

const path = require('path');

const loadMockService = app => {
  const mockServiceDir = path.join('mock', 'service');
  const directory = path.join(app.config.baseDir, 'test', mockServiceDir);
  const _mockService = Symbol('_mockservice');
  app.loader.loadToApp(directory, _mockService);
  app.mock.service = app[_mockService];
};

module.exports = loadMockService;
