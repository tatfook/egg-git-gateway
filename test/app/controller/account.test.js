'use strict';

const { app } = require('egg-mock/bootstrap');

describe('test/app/controller/account.test.js', () => {

  it('should post /accounts to create an account', () => {
    const user = {
      username: 'git-gateway2',
      password: '12345678',
      user_id: 12345,
    };
    return app.httpRequest()
      .post('/accounts')
      .send(user)
      .expect(201);
  });

  it('should delete /accounts/:id to delete an account', () => {
    return app.httpRequest()
      .del('/accounts/12345')
      .expect(204);
  });
});
