'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/model/account.test.js', () => {
  it('should get account model', async () => {
    const ctx = app.mockContext();
    assert(ctx.model.Account);
  });
});
