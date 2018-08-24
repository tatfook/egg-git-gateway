'use strict';

const { app, assert } = require('egg-mock/bootstrap');

let result;
let GitlabService;

before(() => {
  const ctx = app.mockContext();
  GitlabService = ctx.service.gitlab;
});

describe('test/app/service/gitlab.test.js', () => {
  describe('about account', () => {
    it('should create a gitlab account for the given user, and then delete the account', async () => {
      const user = {
        username: 'gitlab_www_testbackend1',
        name: 'testbackend1',
        password: '12345678',
        email: 'testbackend1@paracraft.cn',
      };
      const account = await GitlabService.create_account(user);
      assert(account.username === user.username);
      assert(account._id);
      assert(account.name === user.name);
      await GitlabService.delete_account(account._id);
    });
  });

  describe('about project', async () => {
    it('should get gitlab client', () => {
      assert(GitlabService.client);
    });

    it('should create a project', async () => {
      const project_to_create = {
        name: 'test0001',
        account_id: 11549,
        hook_url: 'http://localhost:8099/api/wiki/models/data_source/gitlabWebhook',
        visibility: 'public',
      };
      result = await GitlabService.create_project(project_to_create);
      assert(result._id);
      assert(result.visibility === 'public');
      assert(result.name);
      assert(result.git_path);
    });

    it('should update the visibility of a project', async () => {
      result = await GitlabService.update_project_visibility(result._id, 'private');
      assert(result.visibility === 'private');
    });

    it('should delete a project', async () => {
      await GitlabService.delete_project(result._id);
    });
  });
});
