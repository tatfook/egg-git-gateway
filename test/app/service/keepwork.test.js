'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/service/keepwork.test.js', () => {
  describe('ensurePermission', () => {
    it('should return false', async () => {
      const ctx = app.mockContext();
      const permitted = await ctx.service.keepwork.ensurePermission(
        1, 2, 'r');
      assert(!permitted);
    });

    it('should return false', async () => {
      const ctx = app.mockContext();
      const permitted = await ctx.service.keepwork.ensurePermission(
        1, 2, 'rw');
      assert(!permitted);
    });

    it('should return true', async () => {
      const ctx = app.mockContext();
      const permitted = await ctx.service.keepwork.ensurePermission(
        6, 5, 'r');
      assert(permitted);
    });

    it('should return false', async () => {
      const ctx = app.mockContext();
      const permitted = await ctx.service.keepwork.ensurePermission(
        6, 5, 'rw');
      assert(!permitted);
    });

    it('should return true', async () => {
      const ctx = app.mockContext();
      const permitted = await ctx.service.keepwork.ensurePermission(
        11, 4, 'rw');
      assert(permitted);
    });
  });
});
