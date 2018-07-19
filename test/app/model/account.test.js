'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/model/account.test.js', () => {
  it('should get account model', async () => {
    const ctx = app.mockContext();
    assert(ctx.model.Account);
  });

  const account = {
    _id: 1234567,
    name: 'test',
    user_id: 123,
  };

  it('should cache after created', async () => {
    const ctx = app.mockContext();
    const AccountModel = ctx.model.Account;
    await AccountModel.create(account);
    const cached_data = await AccountModel.load_cache_by_user_id(account.user_id);

    assert(cached_data.user_id === account.user_id);
    assert(cached_data.name === account.name);
    assert(cached_data._id === account._id);
  });

  it('should get an account', async () => {
    const ctx = app.mockContext();
    const AccountModel = ctx.model.Account;
    const loaded_account = await AccountModel.get_by_user_id(account.user_id);
    assert(loaded_account.user_id === account.user_id);
    assert(loaded_account.name === account.name);
    assert(loaded_account._id === account._id);
  });

  it('should release the cache after deleted', async () => {
    const ctx = app.mockContext();
    const AccountModel = ctx.model.Account;
    await AccountModel.delete_and_release_cache_by_user_id(account.user_id);

    const cached_data = await AccountModel.load_cache_by_user_id(account.user_id);
    assert(!cached_data);
  });
});
