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
    username: 'test_file',
    password: '12345678',
  };

  const project = {
    sitename: 'test_file',
    site_id: 123,
    visibility: 'public',
  };

  await app.httpRequest()
    .post('/accounts')
    .send(user)
    .set('Authorization', `Bearer ${token}`);

  await app.httpRequest()
    .post('/projects/user/test_file')
    .set('Authorization', `Bearer ${token}`)
    .send(project);
});

after(async () => {
  await app.httpRequest()
    .del(`/projects/${encodeURIComponent('test_file/test_file')}`)
    .set('Authorization', `Bearer ${token}`);

  await app.httpRequest()
    .del('/accounts/test_file')
    .set('Authorization', `Bearer ${token}`);
});

describe('test/app/controller/file.test.js', () => {
  const project_path = encodeURIComponent('test_file/test_file');
  const path = encodeURIComponent('test_file/test_file/test.md');
  it('should post /projects/:project_path/files/:path to create a file', () => {
    const file = { content: '123' };
    return app.httpRequest()
      .post(`/projects/${project_path}/files/${path}`)
      .send(file)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });

  it('should get /projects/:project_path/files/:path to get a file', () => {
    return app.httpRequest()
      .get(`/projects/${project_path}/files/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ content: '123' });
  });

  it('should put /projects/:project_path/files/:path to update a file', () => {
    return app.httpRequest()
      .put(`/projects/${project_path}/files/${path}`)
      .send({ content: '456' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  const new_path = 'test_file/test_file/test_new.md';
  it('should put /projects/:project_path/files/:path/move to move a file', () => {
    return app.httpRequest()
      .put(`/projects/${project_path}/files/${path}/move`)
      .send({ new_path })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should delete /projects/:project_path/files/:path to remove a file', () => {
    return app.httpRequest()
      .del(`/projects/${project_path}/files/${encodeURIComponent(new_path)}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
