'use strict';

const { app, assert } = require('egg-mock/bootstrap');

let KeepworkService;

before(() => {
  const ctx = app.mockContext();
  KeepworkService = ctx.service.keepwork;
});

describe('test/app/service/keepwork.test.js', () => {
  describe('ensurePermission', () => {
    it('should return true', async () => {
      app.mock.axios.keepwork.setOnce(200, 32);
      const permitted = await KeepworkService.ensurePermission(
        6, 5, 'r');
      assert(permitted);
    });

    it('should return true', async () => {
      app.mock.axios.keepwork.setOnce(200, 64);
      const permitted = await KeepworkService.ensurePermission(
        11, 4, 'rw');
      assert(permitted);
    });

    it('should return false', async () => {
      app.mock.axios.keepwork.setOnce(200, 0);
      const permitted = await KeepworkService.ensurePermission(
        1, 2, 'r');
      assert(!permitted);
    });

    it('should return false', async () => {
      app.mock.axios.keepwork.setOnce(200, 32);
      const permitted = await KeepworkService.ensurePermission(
        1, 2, 'rw');
      assert(!permitted);
    });

    it('should return false', async () => {
      app.mock.axios.keepwork.setOnce(200, 32);
      const permitted = await KeepworkService.ensurePermission(
        6, 5, 'rw');
      assert(!permitted);
    });
  });
});
