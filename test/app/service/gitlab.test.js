'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/service/gitlba.test.js', () => {
  describe('about account', () => {
    it('should create an gitlab account for the given user, and then delete the account', async () => {
      const ctx = app.mockContext();
      const user = {
        username: 'testgitgateway',
        password: '12345678',
      };
      const GitlabService = ctx.service.gitlab;
      const account = await GitlabService.create_account(user);
      assert(account);
      assert(account.username === `${GitlabService.config.account_prifix}${user.username}`);
      assert(account.id);
      console.log(account);
      await GitlabService.delete_account(account);
    });
  });

  describe('about project', async () => {
    it('should get gitlab client', () => {
      const ctx = app.mockContext();
      assert(ctx.service.gitlab.client);
    });

    it('should get a project from gitlab', async () => {
      const ctx = app.mockContext();
      const project_id = 472;
      const project = await ctx.service.gitlab.load_project(project_id);
      assert(project.id);
      assert(project.visibility);
      assert(project.name);
      assert(project.path_with_namespace);
      assert(project.path);
      assert(project.owner);
      assert(project.namespace);
    });
  });
});
