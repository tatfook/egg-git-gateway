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

  it('should cache after created', async () => {
    await ProjectModel.create(project);
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

  it('should cache after updated', async () => {
    const loaded_project = await ProjectModel.get_by_path_from_db(project.path);
    loaded_project.visibility = 'public';
    await loaded_project.save();
    const cached_data = await ProjectModel.load_cache_by_path(project.path);
    assert(cached_data.visibility === 'public');
  });

  it('should release the cache after deleted', async () => {
    await ProjectModel.delete_and_release_cache(project.path);
    const cached_data = await ProjectModel.load_cache_by_path(project.path);
    assert(!cached_data);
  });
});
