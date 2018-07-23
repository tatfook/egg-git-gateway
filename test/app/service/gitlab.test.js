'use strict';

const { mock, app, assert } = require('egg-mock/bootstrap');

afterEach(mock.restore);

describe('test/app/service/gitlab.test.js', () => {
  describe('about account', () => {
    it('should create a gitlab account for the given user, and then delete the account', async () => {
      const ctx = app.mockContext();
      const user = {
        username: 'gitlab_www_testbackend1',
        name: 'testbackend1',
        password: '12345678',
        email: 'testbackend1@paracraft.cn',
      };
      const GitlabService = ctx.service.gitlab;
      const account = await GitlabService.create_account(user);
      assert(account.username === user.username);
      assert(account._id);
      assert(account.name === user.name);
      await GitlabService.delete_account(account._id);
    });
  });

  describe('about project', async () => {
    it('should get gitlab client', () => {
      const ctx = app.mockContext();
      assert(ctx.service.gitlab.client);
    });

    let result;
    const project_to_create = {
      name: 'test0001',
      account_id: 11549,
      hook_url: 'http://localhost:8099/api/wiki/models/data_source/gitlabWebhook',
      visibility: 'public',
    };

    it('should create a project', async () => {
      const ctx = app.mockContext();
      result = await ctx.service.gitlab.create_project(project_to_create);
      assert(result._id);
      assert(result.visibility === 'public');
      assert(result.name);
      assert(result.git_path);
    });

    it('should update the visibility of a project', async () => {
      const ctx = app.mockContext();
      result = await ctx.service.gitlab.update_project_visibility(result._id, 'private');
      assert(result.visibility === 'private');
    });

    it('should delete a project', async () => {
      const ctx = app.mockContext();
      await ctx.service.gitlab.delete_project(result._id);
    });
  });
});
