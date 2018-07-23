'use strict';

const Controller = require('egg').Controller;

const create_rule = {
  username: 'string',
  password: {
    type: 'password',
    min: 8,
  },
};

class AccountController extends Controller {
  async create() {
    this.ctx.validate(create_rule);
    const account_prifix = this.config.gitlab.account_prifix;
    const email_postfix = this.config.gitlab.email_postfix;
    const account = await this.service.gitlab
      .create_account({
        username: `${account_prifix}${this.ctx.request.body.username}`,
        name: this.ctx.request.body.username,
        password: this.ctx.request.body.password,
        email: `${this.ctx.request.body.username}${email_postfix}`,
      }).catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(err.response.status);
      });
    await this.ctx.model.Account.create({
      _id: account._id,
      username: account.username,
      kw_username: account.name,
    }).catch(err => {
      this.ctx.logger.error(err);
      throw err;
    });
    this.ctx.status = 201;
  }

  async destroy() {
    const account = await this.ctx.model.Account
      .findOne({
        kw_username: this.ctx.params.kw_username,
      }).catch(err => {
        this.ctx.logger.error(err);
        throw err;
      });
    if (!account) {
      this.ctx.throw(404, 'User Not Found');
    }
    await this.service.gitlab
      .delete_account(account._id)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(err.response.status);
      });
    await this.ctx.model.Account
      .delete_and_release_cache_by_kw_username(account.kw_username)
      .catch(err => {
        this.ctx.logger.error(err);
        throw err;
      });
    this.ctx.status = 204;
  }
}

module.exports = AccountController;
