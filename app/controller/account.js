'use strict';

const Controller = require('../core/base_controller');

const create_rule = {
  id: 'int',
  username: { type: 'string', format: /^[a-zA-Z]/ },
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
    const { ctx, service } = this;
    ctx.veryfy();
    const kw_username = ctx.state.user.username;
    const account = await this.get_existing_account({ kw_username });
    if (!account.token) {
      account.token = await service.gitlab.get_token(account._id);
      await account.save().catch(err => {
        const errMsg = 'Failed to get token';
        ctx.logger.error(err);
        ctx.throw(err.response.status, errMsg);
      });
    }
    ctx.body = {
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
    const { ctx, service, config } = this;
    ctx.ensureAdmin();
    ctx.validate(create_rule);
    const kw_username = ctx.params.username;
    await this.ensure_account_not_exist({ kw_username });
    const account_prifix = config.gitlab.account_prifix;
    const email_postfix = config.gitlab.email_postfix;
    const account = await service.gitlab
      .create_account({
        username: `${account_prifix}${kw_username}`,
        name: kw_username,
        password: `kw${ctx.params.password}`,
        email: `${kw_username}${email_postfix}`,
      }).catch(err => {
        ctx.logger.error(err);
        ctx.throw(err.response.status);
      });
    await ctx.model.Account.create({
      _id: account._id,
      kw_id: ctx.params.id,
      name: account.username,
      kw_username,
    }).catch(err => {
      ctx.logger.error(err);
      throw err;
    });
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
    const { ctx, service } = this;
    ctx.ensureAdmin();
    const account = await this.get_existing_account({
      kw_username: ctx.params.kw_username,
    });

    await ctx.model.Node
      .delete_account(account._id)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await ctx.model.Project
      .delete_account(account._id)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await service.gitlab
      .delete_account(account._id)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(err.response.status);
      });
    await ctx.model.Account
      .remove_by_query({ _id: account._id })
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
    this.deleted();
  }

  async ensure_account_not_exist(query) {
    const account = await this.get_account(query);
    this.throw_if_exists(account, 'Account already exists');
  }
}

module.exports = AccountController;
