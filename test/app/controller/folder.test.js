'use strict';

const { app } = require('egg-mock/bootstrap');
const jwt = require('keepwork-jwt-simple');

let token;
const project_path = encodeURIComponent('test_folder/test_folder');

before(async () => {
  const admin = {
    username: 'unittest',
    userId: 15,
    roleId: 10,
  };
  const secret = app.config.jwt.secret;
  token = jwt.encode(admin, secret, 'HS1');

  const user = {
    id: 123,
    username: 'test_folder',
    password: '12345678',
  };

  const project = {
    sitename: 'test_folder',
    site_id: 123,
    visibility: 'public',
  };

  await app.httpRequest()
    .post('/accounts')
    .send(user)
    .set('Authorization', `Bearer ${token}`);

  await app.httpRequest()
    .post('/projects/user/test_folder')
    .set('Authorization', `Bearer ${token}`)
    .send(project);
});

after(async () => {
  await app.httpRequest()
    .del(`/projects/${encodeURIComponent('test_folder/test_folder')}`)
    .set('Authorization', `Bearer ${token}`);

  await app.httpRequest()
    .del('/accounts/test_folder')
    .set('Authorization', `Bearer ${token}`);
});

const path = encodeURIComponent('test_folder/test_folder/new_folder');
describe('test/app/controller/folder.test.js', () => {
  it('should post /projects/:project_path/folders/:path to create a folder', () => {
    return app.httpRequest()
      .post(`/projects/${project_path}/folders/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });

  it('should delete /projects/:project_path/folders/:path to remove a folder', () => {
    return app.httpRequest()
      .del(`/projects/${project_path}/folders/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
