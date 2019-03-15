'use strict';

const Controller = require('../core/base_controller');

const create_rule = {
  id: 'int',
  username: { type: 'string', format: /^[a-zA-Z]/ },
};

class AccountController extends Controller {
  /**
  * @api {post} /accounts create
  * @apiName CreateAccount
  * @apiGroup Account
  * @apiDescription To create a git account for a new keepwork user
  * @apiPermission admin
  *
  * @apiParam {Number} id keepwork user id
  * @apiParam {String} username Username of the user
  */
  async create() {
    const { ctx, service, config } = this;
    ctx.ensureAdmin();
    ctx.validate(create_rule);
    const { id, username } = ctx.params;
    await this.ensureAccountNotExist({ _id: id });

    const { account_prefix } = config.gitlab;
    const namespace = `${account_prefix}${username}`;
    const { storage_name } = await service.gitaly
      .addNameSpace(namespace);

    const account = {
      _id: id, username,
      namespace, storage_name,
    };
    await ctx.model.Account.create(account);
    this.created();
  }

  async ensureAccountNotExist(query) {
    const account = await this.getAccount(query);
    this.throwIfExists(account, 'Account already exists');
  }
}

module.exports = AccountController;
