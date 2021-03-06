'use strict';

const { app, assert } = require('egg-mock/bootstrap');

const project = {
  _id: 12345,
  site_id: 456,
  sitename: 'test1',
  visibility: 'private',
  name: 'keepworktest1',
  path: 'testuser/test1',
  git_path: 'gitlab_www_testuser/keepworktest1',
  account_id: 123,
};

let ProjectModel;

before(() => {
  const ctx = app.mockContext();
  ProjectModel = ctx.model.Project;
});

describe('test/app/model/project.test.js', () => {
  it('should get project model', async () => {
    assert(ProjectModel);
  });

  it('should create the project', async () => {
    await ProjectModel.create(project);
  });

  it('should get project from db', async () => {
    const loaded_project = await ProjectModel.getByPathFromDB(project.path);
    assert(loaded_project._id === project._id);
    assert(loaded_project.visibility === project.visibility);
    assert(loaded_project.name === project.name);
    assert(loaded_project.site_id === project.site_id);
    assert(loaded_project.sitename === project.sitename);
    assert(loaded_project.path === project.path);
    assert(loaded_project.git_path === project.git_path);
    assert(loaded_project.account_id === project.account_id);
  });

  it('should get the cache', async () => {
    const cached_data = await ProjectModel.load_cache_by_path(project.path);
    assert(cached_data._id === project._id);
    assert(cached_data.visibility === project.visibility);
    assert(cached_data.name === project.name);
    assert(cached_data.site_id === project.site_id);
    assert(cached_data.sitename === project.sitename);
    assert(cached_data.path === project.path);
    assert(cached_data.git_path === project.git_path);
    assert(cached_data.account_id === project.account_id);
  });

  it('should release cache after updated', async () => {
    const loaded_project = await ProjectModel.getByPathFromDB(project.path);
    loaded_project.visibility = 'public';
    await loaded_project.save();
    const cached_data = await ProjectModel.load_cache_by_path(project.path);
    assert(!cached_data);
  });

  it('should release the cache after deleted', async () => {
    await ProjectModel.deleteAndReleaseCache(project.path);
    const cached_data = await ProjectModel.load_cache_by_path(project.path);
    assert(!cached_data);
  });
});
