'use strict';

const { app } = require('egg-mock/bootstrap');
const loadMockTools = require('./setup/loader')

before(async () => {
  await app.ready();
  loadMockTools(app);
  const mockMethod = app.mock.service.kafka.send;
  app.mockService('kafka', 'send', mockMethod);
});

beforeEach(() => {
  const mockMethod = app.mock.service.kafka.send;
  app.mockService('kafka', 'send', mockMethod);
});

after(async () => {
  await Promise.all([
    app.model.Account.deleteMany({}),
    app.model.Project.deleteMany({}),
    app.model.Node.deleteMany({}),
    app.model.Message.deleteMany({}),
  ]);
});
