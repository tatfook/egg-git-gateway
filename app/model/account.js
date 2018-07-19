'use strict';

const assert = require('assert');
const { empty } = require('../helper');

const generate_redis_key = user_id => {
  assert(user_id);
  return `accounts-user_id:${user_id}`;
};

module.exports = app => {
  const redis = app.redis;
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const AccountSchema = new Schema({
    _id: { type: Number },
    name: { type: String },
    user_id: { type: Number },
  }, {
    timestamps: true,
  });

  AccountSchema.statics.cache = async function(account) {
    const key = generate_redis_key(account.user_id);
    const serilize_account = JSON.stringify(account);
    await redis.set(key, serilize_account)
      .catch(err => {
        console.log(`fail to cache account ${key}`);
        console.error(err);
      });
  };

  AccountSchema.statics.release_cache_by_user_id = async function(user_id) {
    const key = generate_redis_key(user_id);
    await redis.del(key)
      .catch(err => {
        console.log(`fail to release cache of account ${key}`);
        console.error(err);
      });
  };

  AccountSchema.statics.load_cache_by_user_id = async function(user_id) {
    const key = generate_redis_key(user_id);
    const account = await redis.get(key)
      .catch(err => {
        console.error(err);
      });
    return JSON.parse(account);
  };

  AccountSchema.statics.get_by_user_id = async function(user_id) {
    // load from cache
    let account = await AccountSchema.statics.load_cache_by_user_id(user_id);
    if (!empty(account)) { return account; }

    // load from db
    account = await this.findOne({ user_id })
      .catch(err => { console.log(err); });
    if (!empty(account)) {
      await AccountSchema.statics.cache(account);
      return account;
    }
  };

  AccountSchema.statics.delete_and_release_cache_by_user_id = async function(user_id) {
    await AccountSchema.statics.release_cache_by_user_id(user_id);
    await this.deleteMany({ user_id })
      .catch(err => {
        throw err;
      });
  };

  // cache by post hook
  AccountSchema.post('save', async account => {
    await AccountSchema.statics.cache(account);
  });

  return mongoose.model('Account', AccountSchema);
};
