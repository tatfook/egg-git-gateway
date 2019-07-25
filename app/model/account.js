'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const AccountSchema = new Schema({
    _id: Number,
    name: String,
    kw_id: Number,
    kw_username: { type: String, unique: true },
    token: String,
  }, { timestamps: true });

  return mongoose.model('Account', AccountSchema);
};
