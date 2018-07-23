'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/model/account.test.js', () => {
  it('should get account model', async () => {
    const ctx = app.mockContext();
    assert(ctx.model.Account);
  });

  const account = {
    _id: 123,
    name: 'test123',
    kw_username: 'test123',
  };

  it('should cache after created', async () => {
    const ctx = app.mockContext();
    const AccountModel = ctx.model.Account;
    await AccountModel.create(account);
    const cached_data = await AccountModel.load_cache_by_kw_username(account.kw_username);

    assert(cached_data.kw_usename === account.kw_usename);
    assert(cached_data.name === account.name);
    assert(cached_data._id === account._id);
  });

  it('should get an account', async () => {
    const ctx = app.mockContext();
    const AccountModel = ctx.model.Account;
    const loaded_account = await AccountModel.get_by_kw_username(account.kw_username);
    assert(loaded_account.kw_usename === account.kw_usename);
    assert(loaded_account.name === account.name);
    assert(loaded_account._id === account._id);
  });

  it('should release the cache after deleted', async () => {
    const ctx = app.mockContext();
    const AccountModel = ctx.model.Account;
    await AccountModel.delete_and_release_cache_by_kw_username(account.kw_username);

    const cached_data = await AccountModel.load_cache_by_kw_username(account.kw_username);
    assert(!cached_data);
  });
});
