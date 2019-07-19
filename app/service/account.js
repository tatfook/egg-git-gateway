'use strict';

const Service = require('egg').Service;

const ERR_MSGS = {
  accountNotFound: 'Account not found',
  accountAlreadyExists: 'Account already exists',
};

class AccountService extends Service {
  async getByQuery(query) {
    const { ctx } = this;
    const account = await ctx.model.Account.findOne(query);
    return account;
  }

  // 如果没有创建gitlba token则创建
  async getAccountWithToken(query) {
    const { service } = this;
    const account = await this.getExistsAccount(query);
    if (!account.token) {
      account.token = await service.gitlab.getToken(account._id);
      await account.save();
    }
    return account;
  }

  async deleteByQuery(query) {
    const { ctx, service } = this;
    const account = await this.getExistsAccount(query);

    // 删除关联文件、项目、gitlab数据
    await ctx.model.Node.deleteAccount(account._id);
    await ctx.model.Project.deleteAccount(account._id);
    await service.gitlab.deleteAccount(account._id);

    const result = await ctx.model.Account.deleteOne(query);
    return result;
  }

  // 账号不存在则返回404
  async getExistsAccount(query) {
    const { service } = this;
    const account = await this.getByQuery(query);
    service.common.throwIfNotExist(account, ERR_MSGS.accountNotFound);
    return account;
  }

  // 帐号存在则返回409
  async ensureAccountNotExist(query) {
    const { service } = this;
    const account = await this.getByQuery(query);
    service.common.throwIfExists(account, ERR_MSGS.accountAlreadyExists);
  }

  // 注册gitlab帐号
  async signUpGitlab() {
    const { ctx, service, config } = this;
    const kw_username = ctx.params.username;
    const accountPrefix = config.gitlab.account_prifix;
    const emailPostfix = config.gitlab.email_postfix;
    const account = await service.gitlab.createAccount({
      username: `${accountPrefix}${kw_username}`,
      name: kw_username,
      password: `kw${ctx.params.password}`,
      email: `${kw_username}${emailPostfix}`,
    });
    return account;
  }

  // 将gitlab帐号数据存入数据库
  async create(gitAccount) {
    const { ctx } = this;
    const kw_username = ctx.params.username;
    const account = await ctx.model.Account.create({
      _id: gitAccount._id, kw_id: ctx.params.id,
      name: gitAccount.username, kw_username,
    });
    return account;
  }
}

module.exports = AccountService;
