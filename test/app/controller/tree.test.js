'use strict';

const { app, assert } = require('egg-mock/bootstrap');

let factory;
let project;
let account;
let token;
let encodedProjectPath;

before(async () => {
  factory = app.factory;
  project = await factory.create('Project');
  account = await app.model.Account.findOne({ _id: project.account_id });
  encodedProjectPath = encodeURIComponent(project.path);
  token = app.mock.utils.token.get(account);

  const mockMethod = app.mock.service.common.success;
  app.mockService('keepwork', 'ensurePermission', mockMethod);
  app.mockService('keepwork', 'getUserProfile', mockMethod);

  const file = { content: 'hello' };
  const filePath = 'test_tree/test_tree/test.md';
  await app.httpRequest()
    .post(`/projects/${encodedProjectPath}/files/${encodeURIComponent(filePath)}`, file)
    .set('Authorization', `Bearer ${token}`)
    .send(project);

  const folderPath = 'test_tree/test_tree/new_folder';
  await app.httpRequest()
    .post(`/projects/${encodedProjectPath}/folders/${encodeURIComponent(folderPath)}`)
    .set('Authorization', `Bearer ${token}`)
    .send(project);
});

describe('test/app/controller/tree.test.js', () => {
  it('should get a tree', async () => {
    const mockMethod = app.mock.service.common.success;
    app.mockService('keepwork', 'ensurePermission', mockMethod);
    app.mockService('keepwork', 'getUserProfile', mockMethod);

    const treePath = encodeURIComponent('test_tree/test_tree');
    const res = await app.httpRequest()
      .get(`/projects/${encodedProjectPath}/tree/${treePath}`)
      .expect(200);

    const tree = res.body;
    assert(tree instanceof Array);
    assert(tree.length === 2);
  });
});
