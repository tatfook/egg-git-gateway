'use strict';

const { app, assert } = require('egg-mock/bootstrap');

const account = {
  _id: 123,
  kw_id: 132,
  name: 'test123',
  kw_username: 'test123',
};

let AccountModel;

before(() => {
  const ctx = app.mockContext();
  AccountModel = ctx.model.Account;
});

describe('test/app/model/account.test.js', () => {
  it('should get account model', async () => {
    assert(AccountModel);
  });

  it('should cache after created', async () => {
    await AccountModel.create(account);
    const cached_data = await AccountModel.load_cache_by_kw_username(account.kw_username);
    assert(cached_data.kw_usename === account.kw_usename);
    assert(cached_data.name === account.name);
    assert(cached_data._id === account._id);
    assert(cached_data.kw_id === account.kw_id);
  });

  it('should get an account', async () => {
    const loaded_account = await AccountModel.get_by_kw_username(account.kw_username);
    assert(loaded_account.kw_usename === account.kw_usename);
    assert(loaded_account.name === account.name);
    assert(loaded_account.kw_id === account.kw_id);
    assert(loaded_account._id === account._id);
  });

  it('should release the cache after deleted', async () => {
    await AccountModel.delete_and_release_cache_by_kw_username(account.kw_username);
    const cached_data = await AccountModel.load_cache_by_kw_username(account.kw_username);
    assert(!cached_data);
  });
});
