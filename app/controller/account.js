'use strict';

const Controller = require('../core/base_controller');

const CREATE_RULE = {
  id: 'int',
  username: { type: 'string', format: /^[a-zA-Z]/ },
  password: { type: 'password', min: 6 },
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
    ctx.verify();
    const kw_username = ctx.state.user.username;

    // 查询带gitlab token的account信息
    const account = await service.account
      .getAccountWithToken({ kw_username });
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
    // 验证管理员权限、校验参数
    const { ctx, service } = this;
    ctx.ensureAdmin();
    ctx.validate(CREATE_RULE);

    // 检查账户是否已存在
    const kw_username = ctx.params.username;
    await service.account.ensureAccountNotExist({ kw_username });

    // 注册gitlab账户，存入数据库
    const gitAccount = await service.account.signUpGitlab();
    await service.account.create(gitAccount);
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
    const { kw_username } = ctx.params;
    await service.account.deleteByQuery({ kw_username });
    this.deleted();
  }
}

module.exports = AccountController;
