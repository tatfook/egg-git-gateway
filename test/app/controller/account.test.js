'use strict';

const { app } = require('egg-mock/bootstrap');
const jwt = require('keepwork-jwt-simple');

const user = {
  id: 123,
  username: 'gitgateway123',
  password: '12345678',
};

let token;

before(() => {
  const admin = {
    username: 'unittest',
    userId: 15,
    roleId: 10,
  };

  const secret = app.config.jwt.secret;
  token = jwt.encode(admin, secret, 'HS1');
});

describe('test/app/controller/account.test.js', () => {
  it('should post /accounts to create an account', () => {
    return app.httpRequest()
      .post('/accounts')
      .send(user)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });

  it('should delete /accounts/:id to delete an account', () => {
    return app.httpRequest()
      .del('/accounts/gitgateway123')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
