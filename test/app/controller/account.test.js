'use strict';

const { app } = require('egg-mock/bootstrap');

describe('test/app/controller/account.test.js', () => {

  const admin = {
    username: 'unittest',
    userId: 15,
    roleId: 10,
  };

  it('should post /accounts to create an account', () => {
    const user = {
      username: 'gitgateway123',
      password: '12345678',
    };

    const secret = app.config.jwt.secret;
    const token = app.jwt.sign(admin, secret);
    return app.httpRequest()
      .post('/accounts')
      .send(user)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  });

  it('should delete /accounts/:id to delete an account', () => {
    const secret = app.config.jwt.secret;
    const token = app.jwt.sign(admin, secret);
    return app.httpRequest()
      .del('/accounts/gitgateway123')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
