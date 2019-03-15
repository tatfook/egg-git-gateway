'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const AccountSchema = new Schema({
    _id: Number,
    username: { type: String, unique: true },
    namespace: String,
    storage_name: String,
  }, { timestamps: true });

  return mongoose.model('Account', AccountSchema);
};
