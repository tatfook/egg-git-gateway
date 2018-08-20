'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/controller/project.test.js', () => {
  const project = {
    sitename: 'justtest1234',
    site_id: 123,
    hook_url: 'http://stage.keepwork.com/api/wiki/models/data_source/gitlabWebhook',
    visibility: 'public',
  };

  const admin = {
    username: 'unittest',
    userId: 15,
    roleId: 10,
  };

  it('should post /projects/user/:kw_username to create a project', () => {
    const secret = app.config.jwt.secret;
    const token = app.jwt.sign(admin, secret);
    return app.httpRequest()
      .post('/projects/user/backend')
      .set('Authorization', `Bearer ${token}`)
      .send(project)
      .expect(201);
  });

  it('should put /projects/:path/visibility to update the visibility of a project', () => {
    const path = encodeURIComponent('backend/justtest1234');
    const secret = app.config.jwt.secret;
    const token = app.jwt.sign(admin, secret);
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
    const path = encodeURIComponent('backend/justtest1234');
    const secret = app.config.jwt.secret;
    const token = app.jwt.sign(admin, secret);
    return app.httpRequest()
      .del(`/projects/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
