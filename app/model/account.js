'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const AccountSchema = new Schema({
    _id: { type: Number },
    name: { type: String },
    keepwork_user_id: { type: Number },
  }, {
    timestamps: true,
  });

  return mongoose.model('Account', AccountSchema);
};
