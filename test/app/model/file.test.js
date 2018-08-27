'use strict';

const { app, assert } = require('egg-mock/bootstrap');

const file = {
  name: 'test.md',
  path: 'test_account/test_project/test.md',
  content: 'just a test',
  type: 'blob',
  project_id: 789,
  account_id: 789,
};

let FileModel;

before(() => {
  const ctx = app.mockContext();
  FileModel = ctx.model.File;
});

describe('test/app/model/file.test.js', () => {
  it('should get file model', async () => {
    assert(FileModel);
  });

  it('should cache after created', async () => {
    await FileModel.create(file);
    const cached_data = await FileModel.load_content_cache_by_path(file.path);
    assert(cached_data.name = file.name);
    assert(cached_data.path = file.path);
    assert(cached_data.content = file.content);
  });

  it('should get an file from cache', async () => {
    const loaded_from_cache = await FileModel.get_by_path(file.path);
    assert(loaded_from_cache.name = file.name);
    assert(loaded_from_cache.path = file.path);
    assert(loaded_from_cache.content = file.content);
  });

  it('should get an file from database', async () => {
    const loaded_from_db = await FileModel.get_by_path_from_db(file.path);
    assert(loaded_from_db.name = file.name);
    assert(loaded_from_db.path = file.path);
    assert(loaded_from_db.content = file.content);
    assert(loaded_from_db.type = file.type);
    assert(loaded_from_db.project_id = file.project_id);
    assert(loaded_from_db.account_id = file.account_id);
  });

  it('should release the cache after deleted', async () => {
    await FileModel.delete_and_release_cache(file);
    const cached_data = await FileModel.load_content_cache_by_path(file.path);
    assert(!cached_data);
  });
});
