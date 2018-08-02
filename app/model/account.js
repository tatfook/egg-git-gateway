'use strict';

const assert = require('assert');
const { empty } = require('../helper');

const generate_redis_key = kw_username => {
  assert(kw_username);
  return `accounts-kw_username:${kw_username}`;
};

module.exports = app => {
  const redis = app.redis;
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const logger = app.logger;

  const AccountSchema = new Schema({
    _id: Number,
    name: String,
    kw_username: { type: String, unique: true },
  }, { timestamps: true });

  const statics = AccountSchema.statics;

  statics.cache = async function(account) {
    const key = generate_redis_key(account.kw_username);
    const serilize_account = JSON.stringify(account);
    await redis.set(key, serilize_account)
      .catch(err => {
        logger.error(`fail to cache account ${key}`);
        logger.error(err);
      });
  };

  statics.release_cache_by_kw_username = async function(kw_username) {
    const key = generate_redis_key(kw_username);
    await redis.del(key)
      .catch(err => {
        logger.error(`fail to release cache of account ${key}`);
        logger.error(err);
      });
  };

  statics.load_cache_by_kw_username = async function(kw_username) {
    const key = generate_redis_key(kw_username);
    const account = await redis.get(key)
      .catch(err => {
        logger.error(err);
      });
    return JSON.parse(account);
  };

  statics.get_by_kw_username = async function(kw_username, from_cache = true) {
    let account;

    // load from cache
    if (from_cache) {
      account = await this.load_cache_by_kw_username(kw_username);
      if (!empty(account)) { return account; }
    }

    // load from db
    account = await this.findOne({ kw_username })
      .catch(err => { logger.error(err); });
    if (!empty(account)) {
      await this.cache(account);
      return account;
    }
  };

  statics.delete_and_release_cache_by_kw_username = async function(kw_username) {
    await this.release_cache_by_kw_username(kw_username);
    await this.deleteOne({ kw_username })
      .catch(err => {
        throw err;
      });
  };

  // cache by post hook
  AccountSchema.post('save', async account => {
    await statics.cache(account);
  });

  return mongoose.model('Account', AccountSchema);
};
