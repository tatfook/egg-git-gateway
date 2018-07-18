'use strict';

const { mock, app, assert } = require('egg-mock/bootstrap');

afterEach(mock.restore);

describe('test/app/service/gitlab.test.js', () => {
  describe('about account', () => {
    it('should create an gitlab account for the given user, and then delete the account', async () => {
      const ctx = app.mockContext();
      const user = {
        username: 'testgitgateway',
        password: '12345678',
      };
      const GitlabService = ctx.service.gitlab;
      const account = await GitlabService.create_account(user);
      assert(account.username === `${app.config.gitlab.account_prifix}${user.username}`);
      assert(account.id);
      await GitlabService.delete_account(account.id);
    });
  });

  describe('about project', async () => {
    it('should get gitlab client', () => {
      const ctx = app.mockContext();
      assert(ctx.service.gitlab.client);
    });

    let result;
    const project_to_create = {
      name: 'test10',
      account_id: 11549,
      hook_url: 'http://localhost:8099/api/wiki/models/data_source/gitlabWebhook',
      visibility: 'public',
    };

    it('should create a project', async () => {
      const ctx = app.mockContext();
      result = await ctx.service.gitlab.create_project(project_to_create);
      assert(result.id);
      assert(result.visibility === 'public');
      assert(result.name);
      assert(result.path_with_namespace);
      assert(result.path);
      assert(result.owner);
      assert(result.namespace);
    });

    it('should update the visibility of a project', async () => {
      const ctx = app.mockContext();
      result = await ctx.service.gitlab.update_project_visibility(result.id, 'private');
      assert(result.visibility === 'private');
    });

    it('should get a project from gitlab', async () => {
      const ctx = app.mockContext();
      result = await ctx.service.gitlab.load_project(result.id);
      assert(result.id);
      assert(result.visibility);
      assert(result.name);
      assert(result.path_with_namespace);
      assert(result.path);
      assert(result.owner);
      assert(result.namespace);
    });

    it('should delete a project', async () => {
      const ctx = app.mockContext();
      await ctx.service.gitlab.delete_project(result.id);
    });
  });
});
