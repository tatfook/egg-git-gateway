'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/service/gitaly.test.js', () => {
  it('should regularly get every element of storages ', () => {
    const { service } = app.mockContext();
    assert(service.gitaly.allocateStorage() === 'default');
  });

  it('should add a namespace', async () => {
    const { service } = app.mockContext();
    const namespace = await service.gitaly.addNameSpace('unittest');
    assert(namespace.storage_name);
    assert(namespace.name);
  });

  it('should create a repo', async () => {
    const { service } = app.mockContext();
    const storage_name = 'default';
    const namespace = 'unittest';
    const repo_name = 'test';
    const relative_path = `${namespace}/${repo_name}.git`;
    const repo = await service.gitaly.createRepository(storage_name, namespace, repo_name);
    assert(repo.storage_name === storage_name);
    assert(repo.relative_path === relative_path);
  });

  it('should delete a repo', async () => {
    const { service } = app.mockContext();
    const storage_name = 'default';
    const namespace = 'unittest';
    const repo_name = 'test';
    const deleted = await service.gitaly.deleteRepository(storage_name, namespace, repo_name);
    assert(deleted);
  });
});
