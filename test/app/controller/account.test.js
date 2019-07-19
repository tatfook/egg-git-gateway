'use strict';

const { app, assert } = require('egg-mock/bootstrap');

let token;
let factory;

before(() => {
  token = app.mock.utils.token.getAdminToken();
  factory = app.factory;
});

describe('test/app/controller/account.test.js', () => {
  it('should post /accounts', async () => {
    const user = {
      id: 123,
      username: 'test1234',
      password: '12345678',
    };

    const mockMethod = app.mock.service.gitlab.createAccount;
    app.mockService('gitlab', 'createAccount', mockMethod);

    await app.httpRequest()
      .post('/accounts')
      .send(user)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const account = await app.model.Account.findOne({ kw_id: user.id });
    assert(account);
    assert(account.kw_username === user.username);
  });

  it('should delete /accounts/:id', async () => {
    const mockMethod = app.mock.service.common.success;
    app.mockService('gitlab', 'deleteAccount', mockMethod);

    const account = await factory.create('Account');
    const loadBeforeDeleted = await app.model.Account.findOne({ _id: account._id });
    assert(account.kw_id === loadBeforeDeleted.kw_id);

    await app.httpRequest()
      .del(`/accounts/${account.kw_username}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const loadAfterDeleted = await app.model.Account.findOne({ _id: account._id });
    assert(loadAfterDeleted === null);
  });

  it('should get /accounts', async () => {
    const mockMethod = app.mock.service.gitlab.getToken;
    app.mockService('gitlab', 'getToken', mockMethod);

    const account = await factory.create('Account');
    const token = app.mock.utils.token.get({
      username: account.kw_username,
      userId: account.kw_id,
    });

    const res = await app.httpRequest()
      .get('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert(res.body);
    assert(res.body.token);
  });
});
