'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const HomeSchema = new Schema({
    key: { type: String },
    path: { type: String },
  });

  return mongoose.model('Home', HomeSchema);
};
