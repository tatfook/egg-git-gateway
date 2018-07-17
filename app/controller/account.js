'use strict';

const Controller = require('egg').Controller;

const create_rule = {
  id: 'int',
  username: 'string',
  password: {
    type: 'password',
    min: 8,
  },
};

class AccountController extends Controller {
  async create() {
    this.ctx.validate(create_rule);
    const account = await this.service.gitlab.create_account({
      username: this.ctx.request.body.username,
      password: this.ctx.request.body.password,
    }).catch(err => {
      console.error(err);
      this.ctx.throw(err.response.status);
    });
    await this.ctx.model.Account.create({
      _id: account.id,
      name: account.username,
      user_id: this.ctx.request.body.id,
    }).catch(err => {
      console.error(err);
      throw err;
    });
    this.ctx.status = 201;
  }

  async destroy() {
    const account = await this.ctx.model.Account.findOne({
      user_id: this.ctx.params.id,
    }).catch(err => {
      console.error(err);
      throw err;
    });
    if (!account) {
      this.ctx.throw(404, 'User Not Found');
    }
    await this.service.gitlab.delete_account(account).catch(err => {
      console.error(err);
      this.ctx.throw(err.response.status);
    });
    await account.remove().catch(err => {
      console.error(err);
      throw err;
    });
    this.ctx.status = 204;
  }
}

module.exports = AccountController;
