'use strict';

const path = require('path');
const FactoryGirl = require('factory-girl');

const loadFactory = app => {
  const mockFactoryDir = path.join('mock', 'factory');
  const factory = FactoryGirl.factory;
  const adapter = new FactoryGirl.MongooseAdapter();
  factory.setAdapter(adapter);
  app.factory = factory;
  const directory = path.join(app.config.baseDir, 'test', mockFactoryDir);
  app.loader.loadToApp(directory, Symbol('_factory'));
};

module.exports = loadFactory;
