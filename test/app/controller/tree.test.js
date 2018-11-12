'use strict';

const { app, assert } = require('egg-mock/bootstrap');
const jwt = require('keepwork-jwt-simple');

let token;
const project_path = encodeURIComponent('test_tree/test_tree');

before(async () => {
  const admin = {
    username: 'unittest',
    userId: 15,
    roleId: 10,
  };
  const secret = app.config.jwt.secret;
  token = jwt.encode(admin, secret, 'HS1');

  const user = {
    id: 789,
    username: 'test_tree',
    password: '12345678',
  };

  const project = {
    sitename: 'test_tree',
    site_id: 123,
    visibility: 'public',
  };

  await app.httpRequest()
    .post('/accounts')
    .send(user)
    .set('Authorization', `Bearer ${token}`);

  await app.httpRequest()
    .post('/projects/user/test_tree')
    .set('Authorization', `Bearer ${token}`)
    .send(project);

  const file = { content: 'hello' };
  const file_path = 'test_tree/test_tree/test.md';
  await app.httpRequest()
    .post(`/projects/${project_path}/files/${encodeURIComponent(file_path)}`, file)
    .set('Authorization', `Bearer ${token}`)
    .send(project);

  const folder_path = 'test_tree/test_tree/new_folder';
  await app.httpRequest()
    .post(`/projects/${project_path}/folders/${encodeURIComponent(folder_path)}`)
    .set('Authorization', `Bearer ${token}`)
    .send(project);
});

describe('test/app/controller/tree.test.js', () => {
  it('should get a tree', () => {
    const tree_path = encodeURIComponent('test_tree/test_tree');
    return app.httpRequest()
      .get(`/projects/${project_path}/tree/${tree_path}`)
      .expect(200)
      .expect(response => {
        const tree = response.body;
        assert(tree instanceof Array);
        assert(tree.length === 2);
      });
  });
});

after(async () => {
  await app.httpRequest()
    .del(`/projects/${encodeURIComponent('test_tree/test_tree')}`)
    .set('Authorization', `Bearer ${token}`);

  await app.httpRequest()
    .del('/accounts/test_tree')
    .set('Authorization', `Bearer ${token}`);
});
