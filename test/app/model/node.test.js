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

let NodeModel;

before(() => {
  const ctx = app.mockContext();
  NodeModel = ctx.model.Node;
});

describe('test/app/model/node.test.js', () => {
  it('should get file model', async () => {
    assert(NodeModel);
  });

  it('should cache after created', async () => {
    await NodeModel.create(file);
  });

  it('should get an file from database', async () => {
    const loaded_from_db = await NodeModel.getByPathFromDB(file.project_id, file.path);
    assert(loaded_from_db.name = file.name);
    assert(loaded_from_db.path = file.path);
    assert(loaded_from_db.content = file.content);
    assert(loaded_from_db.type = file.type);
    assert(loaded_from_db.project_id = file.project_id);
    assert(loaded_from_db.account_id = file.account_id);
  });

  it('should get an file from cache', async () => {
    const loaded_from_cache = await NodeModel.loadContentCacheByPath(file.project_id, file.path);
    assert(loaded_from_cache.type = file.type);
    assert(loaded_from_cache.path = file.path);
    assert(loaded_from_cache.content = file.content);
  });

  it('should release the cache after deleted', async () => {
    await NodeModel.deleteAndReleaseCache(file);
    const cached_data = await NodeModel.loadContentCacheByPath(file.project_id, file.path);
    assert(!cached_data);
  });
});
