'use strict';

const path = require('path');

const loadMockUtils = app => {
  const mockUtilsDir = path.join('mock', 'utils');
  const directory = path.join(app.config.baseDir, 'test', mockUtilsDir);
  const _mockUtils = Symbol('_mockUtils');
  app.loader.loadToApp(directory, _mockUtils);
  app.mock.utils = app[_mockUtils];
};

module.exports = loadMockUtils;
