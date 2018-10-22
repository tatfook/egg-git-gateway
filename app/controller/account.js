'use strict';

const Controller = require('../core/base_controller');

const create_rule = {
  id: 'int',
  username: 'string',
  password: {
    type: 'password',
    min: 6,
  },
};

class AccountController extends Controller {
  /**
  * @api {get} /accounts get account
  * @apiName ShowAccount
  * @apiGroup Account
  * @apiDescription To get the information of an account
  * @apiPermission authorized user
  *
  * @apiParam {Number} id keepwork user id
  * @apiParam {String} username Username of the user
  * @apiParam {String{ > 6 }} password Password of the gitlab account
  */
  async show() {
    this.ctx.veryfy();
    const kw_username = this.ctx.state.user.username;
    const account = await this.ctx.model.Account
      .get_by_kw_username(kw_username)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(err.response.status);
      });
    if (!account) { this.ctx.throw(404, 'Account not found'); }
    if (!account.token) {
      account.token = await this.service.gitlab.get_token(account._id);
      await account.save().catch(err => {
        const errMsg = 'Failed to get token';
        this.ctx.logger.error(err);
        this.ctx.throw(err.response.status, errMsg);
      });
    }
    this.ctx.body = {
      git_id: account._id,
      git_username: account.name,
      token: account.token,
    };
  }

  /**
  * @api {post} /accounts create
  * @apiName CreateAccount
  * @apiGroup Account
  * @apiDescription To create a git account for a new keepwork user
  * @apiPermission admin
  *
  * @apiParam {Number} id keepwork user id
  * @apiParam {String} username Username of the user
  * @apiParam {String{ > 6 }} password Password of the gitlab account
  */
  async create() {
    this.ctx.ensureAdmin();
    this.ctx.validate(create_rule);
    const account_prifix = this.config.gitlab.account_prifix;
    const email_postfix = this.config.gitlab.email_postfix;
    const account = await this.service.gitlab
      .create_account({
        username: `${account_prifix}${this.ctx.request.body.username}`,
        name: this.ctx.request.body.username,
        password: `kw${this.ctx.request.body.password}`,
        email: `${this.ctx.request.body.username}${email_postfix}`,
      }).catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(err.response.status);
      });
    await this.ctx.model.Account.create({
      _id: account._id,
      kw_id: this.ctx.request.body.id,
      name: account.username,
      kw_username: account.name,
    }).catch(err => {
      this.ctx.logger.error(err);
      throw err;
    });

    const es_message = {
      action: 'create_user',
      user_id: this.ctx.request.body.id,
    };
    await this.send_message(account._id, es_message);

    this.created();
  }

  /**
  * @api {delete} /accounts/:username remove
  * @apiName RemoveAccount
  * @apiGroup Account
  * @apiDescription To remove an account
  * @apiPermission admin
  *
  * @apiParam {String} username Username of the user
  */
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

    await this.ctx.model.Node
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

  async send_message(account_id, es_message) {
    const wrapped_es_message = this.service.kafka
      .wrap_elasticsearch_message(es_message, account_id);
    await this.service.kafka.send(wrapped_es_message)
      .catch(err => {
        this.ctx.logger.error(err);
      });
  }
}

module.exports = AccountController;
