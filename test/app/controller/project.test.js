'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/controller/project.test.js', () => {
  const project = {
    sitename: 'justtest1234',
    hook_url: 'http://stage.keepwork.com/api/wiki/models/data_source/gitlabWebhook',
    visibility: 'public',
  };

  it('should post /projects/user/:kw_username to create a project', () => {
    return app.httpRequest()
      .post('/projects/user/backend')
      .send(project)
      .expect(201);
  });

  it('should put /projects/:path/visibility to update the visibility of a project', () => {
    const path = encodeURIComponent('backend/justtest1234');
    return app.httpRequest()
      .put(`/projects/${path}/visibility`)
      .send({ visibility: 'private' })
      .expect(200)
      .expect(res => {
        assert(res.body.visibility === 'private');
      });
  });

  it('should delete /projects/:path to delete an project', () => {
    const path = encodeURIComponent('backend/justtest1234');
    return app.httpRequest()
      .del(`/projects/${path}`)
      .expect(204);
  });
});
