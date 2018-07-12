'use strict';

const { app } = require('egg-mock/bootstrap');

describe('test/app/controller/account.test.js', () => {

  it('should post /accounts to create an account', () => {
    const user = {
      username: 'testgitgateway',
      password: '12345678',
      id: 1234567890,
    };
    return app.httpRequest()
      .post('/accounts')
      .send(user)
      .expect(201);
  });

  it('should delete /accounts/:id to delete an account', () => {
    return app.httpRequest()
      .del('/accounts/1234567890')
      .expect(204);
  });
});
