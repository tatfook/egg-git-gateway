'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/extend/context.test.js', () => {
  describe('ensurePermission', () => {
    it('should throw 401', async () => {
      const ctx = app.mockContext();
      try {
        await ctx.ensurePermission(1, 2);
      } catch (err) {
        assert(err.name === 'UnauthorizedError');
      }
    });

    it('should not throw 401', async () => {
      const ctx = app.mockContext();
      ctx.state = { user: { _id: 15, username: 'test' } };
      await ctx.ensurePermission(1, 'rw');
    });
  });
});
