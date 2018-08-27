'use strict';

const { app } = require('egg-mock/bootstrap');

let token;

before(async () => {
  const admin = {
    username: 'unittest',
    userId: 15,
    roleId: 10,
  };
  const secret = app.config.jwt.secret;
  token = app.jwt.sign(admin, secret);

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
  it('should post /folders/:path to create a folder', () => {
    return app.httpRequest()
      .post(`/folders/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });

  it('should delete /folders/:path to remove a folder', () => {
    return app.httpRequest()
      .del(`/folders/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
