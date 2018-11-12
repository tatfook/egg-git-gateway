'use strict';

const { empty } = require('../lib/helper');

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const logger = app.logger;

  const AccountSchema = new Schema({
    _id: Number,
    name: String,
    kw_id: Number,
    kw_username: { type: String, unique: true },
    token: String,
  }, { timestamps: true });

  const statics = AccountSchema.statics;

  statics.get_by_query = async function(query) {
    const account = await this.findOne(query)
      .catch(err => {
        logger.error(err);
        throw err;
      });
    if (!empty(account)) { return account; }
  };

  statics.remove_by_query = async function(query) {
    await this.deleteOne(query)
      .catch(err => {
        logger.error(err);
        throw err;
      });
  };

  return mongoose.model('Account', AccountSchema);
};
