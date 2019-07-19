'use strict';

const path = require('path');
const Axios = require('axios');
const AxiosMockAdapter = require('axios-mock-adapter');

const loadMockAxios = app => {
  const mockAxiosDir = path.join('mock', 'axios');
  const mockAxios = new AxiosMockAdapter(Axios);
  app.mockAxios = mockAxios;
  const directory = path.join(app.config.baseDir, 'test', mockAxiosDir);
  app.loader.loadToApp(directory, Symbol('_mock_axios'));
};

module.exports = loadMockAxios;
