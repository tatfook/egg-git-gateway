'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/controller/project.test.js', () => {
  const project = {
    name: 'justtest1234',
    site_id: 123,
    hook_url: 'http://localhost:8099/api/wiki/models/data_source/gitlabWebhook',
    visibility: 'public',
  };

  it('should post /projects/user/:user_id to create a project', () => {
    return app.httpRequest()
      .post('/projects/user/1')
      .send(project)
      .expect(201);
  });

  it('should put /projects/:path/visibility to update the visibility of a project', () => {
    const path = encodeURIComponent('gitlab_www_backend/justtest1234');
    return app.httpRequest()
      .put(`/projects/${path}/visibility`)
      .send({ visibility: 'private' })
      .expect(200)
      .expect(res => {
        assert(res.body.visibility === 'private');
      });
  });

  it('should delete /projects/:path to delete an project', () => {
    const path = encodeURIComponent('gitlab_www_backend/justtest1234');
    return app.httpRequest()
      .del(`/projects/${path}`)
      .expect(204);
  });
});
