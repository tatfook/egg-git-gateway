'use strict';

const { app, assert } = require('egg-mock/bootstrap');
const jwt = require('keepwork-jwt-simple');

const project = {
  sitename: 'test',
  site_id: 456,
  visibility: 'public',
};

let token;

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
    username: 'unittest',
    password: '12345678',
  };

  await app.httpRequest()
    .post('/accounts')
    .set('Authorization', `Bearer ${token}`)
    .send(user);
});

after(async () => {
  await app.httpRequest()
    .del('/accounts/unittest')
    .set('Authorization', `Bearer ${token}`);
});

describe('test/app/controller/project.test.js', () => {
  it('should post /projects/user/:kw_username to create a project', () => {
    return app.httpRequest()
      .post('/projects/user/unittest')
      .set('Authorization', `Bearer ${token}`)
      .send(project)
      .expect(201);
  });

  it('should put /projects/:path/visibility to update the visibility of a project', () => {
    const path = encodeURIComponent('unittest/test');
    return app.httpRequest()
      .put(`/projects/${path}/visibility`)
      .send({ visibility: 'private' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(res => {
        assert(res.body.visibility === 'private');
      });
  });

  it('should delete /projects/:path to delete an project', () => {
    const path = encodeURIComponent('unittest/test');
    return app.httpRequest()
      .del(`/projects/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
