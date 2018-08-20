'use strict';

/**
 * @api {post} /accounts create
 * @apiName CreateAccount
 * @apiGroup Account
 * @apiPermission admin
 *
 * @apiParam {String} username Username of the user.
 * @apiParam {String} password Password of the gitlab account
 */

/**
 * @api {post} /accounts/:username remove
 * @apiName RemoveAccount
 * @apiGroup Account
 * @apiPermission admin
 */

const Controller = require('../core/base_controller');

const create_rule = {
  username: 'string',
  password: {
    type: 'password',
    min: 8,
  },
};

class AccountController extends Controller {
  async create() {
    this.ctx.ensureAdmin();
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
    this.created();
  }
  async remove() {
    this.ctx.ensureAdmin();
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

    await this.ctx.model.File
      .delete_account(account._id)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await this.ctx.model.Project
      .delete_account(account._id)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

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
        this.ctx.throw(500);
      });

    const es_message = {
      action: 'remove_user',
      username: account.kw_username,
    };
    await this.send_message(account._id, es_message);

    this.deleted();
  }

  async send_message(user_id, es_message) {
    const wrapped_es_message = this.service.kafka
      .wrap_elasticsearch_message(es_message, user_id);
    await this.service.kafka.send(wrapped_es_message)
      .catch(err => {
        this.ctx.logger.error(err);
      });
  }
}

module.exports = AccountController;
