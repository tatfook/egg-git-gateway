'use strict';

const Controller = require('egg').Controller;

const create_rule = {
  user_id: 'int',
  username: 'string',
  password: {
    type: 'password',
    min: 8,
  },
};

class AccountController extends Controller {
  async create() {
    this.ctx.validate(create_rule);
    const account = await this.service.gitlab
      .create_account({
        username: this.ctx.request.body.username,
        password: this.ctx.request.body.password,
      }).catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(err.response.status);
      });
    await this.ctx.model.Account.create({
      _id: account.id,
      name: account.username,
      user_id: this.ctx.request.body.user_id,
    }).catch(err => {
      this.ctx.logger.error(err);
      throw err;
    });
    this.ctx.status = 201;
  }

  async destroy() {
    const account = await this.ctx.model.Account
      .findOne({
        user_id: this.ctx.params.user_id,
      }).catch(err => {
        this.ctx.logger.error(err);
        throw err;
      });
    if (!account) {
      this.ctx.throw(404, 'User Not Found');
    }
    await this.service.gitlab
      .delete_account(account.id)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(err.response.status);
      });
    await this.ctx.model.Account
      .delete_and_release_cache_by_user_id(account.user_id)
      .catch(err => {
        this.ctx.logger.error(err);
        throw err;
      });
    this.ctx.status = 204;
  }
}

module.exports = AccountController;
