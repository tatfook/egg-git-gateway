'use strict';

const { app, assert } = require('egg-mock/bootstrap');

let token;
let factory;

before(async () => {
  factory = app.factory;
  token = app.mock.utils.token.getAdminToken();
});

describe('test/app/controller/project.test.js', () => {
  it('should post /projects/user/:kw_username to create a project', async () => {
    const mockMethod = app.mock.service.gitlab.createProject;
    app.mockService('gitlab', 'createProject', mockMethod);

    const account = await factory.create('Account');
    const project = {
      sitename: 'test',
      site_id: 456,
      visibility: 'public',
    };

    await app.httpRequest()
      .post(`/projects/user/${account.kw_username}`)
      .set('Authorization', `Bearer ${token}`)
      .send(project)
      .expect(201);

    const path = `${account.kw_username}/${project.sitename}`;
    const projectGetFromDB = await app.model.Project.findOne({ path });
    assert(projectGetFromDB);
    assert(projectGetFromDB.path === path);
    assert(projectGetFromDB.account_id === account._id);
  });

  it('should fail to post /projects/user/:kw_username', async () => {
    const mockMethod = app.mock.service.gitlab.createProject;
    app.mockService('gitlab', 'createProject', mockMethod);

    const project = await factory.create('Project');
    const account = await app.model.Account.findOne({ _id: project.account_id });
    assert(account);

    return app.httpRequest()
      .post(`/projects/user/${account.kw_username}`)
      .set('Authorization', `Bearer ${token}`)
      .send(project)
      .expect(409);
  });

  it('should put /projects/:path/visibility to update the visibility of a project', async () => {
    const mockMethod = app.mock.service.common.success;
    app.mockService('gitlab', 'updateProjectVisibility', mockMethod);

    const project = await factory.create('Project');
    const path = encodeURIComponent(project.path);
    await app.httpRequest()
      .put(`/projects/${path}/visibility`)
      .send({ visibility: 'private' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(res => {
        assert(res.body.visibility === 'private');
      });

    const projectGetFromDB = await app.model.Project.findOne({ _id: project._id });
    assert(project.path === projectGetFromDB.path);
    assert(projectGetFromDB.visibility === 'private');
  });

  it('should delete /projects/:path to delete an project', async () => {
    const mockMethod = app.mock.service.common.success;
    app.mockService('gitlab', 'deleteProject', mockMethod);

    const project = await factory.create('Project');
    const path = encodeURIComponent(project.path);
    await app.httpRequest()
      .del(`/projects/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const projectGetFromDB = await app.model.Project.findOne({ path });
    assert(projectGetFromDB === null);
  });
});
