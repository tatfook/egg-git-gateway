'use strict';

const MessageFormatter = require('../lib/message_formatter');

module.exports = app => {
  const { mongoose } = app;
  const Schema = mongoose.Schema;

  const ActionSchema = new Schema({
    _id: String,
    action: String,
    file_path: String,
    previous_path: String,
    content: String,
    version: Number,
    encoding: { type: String, default: 'text' },
  });

  const MessageSchema = new Schema({
    branch: { type: String, default: 'master' },
    visibility: { type: String, default: 'public' },
    project_id: String,
    actions: [ ActionSchema ],
    commit_message: String,
    author_name: String,
    source_version: Number,
  }, { timestamps: true });

  const statics = MessageSchema.statics;

  statics.createFile = function(files, project_id, options) {
    const message = MessageFormatter.createFile(files, project_id, options);
    return this.create(message);
  };

  statics.updateFile = function(files, project_id, options) {
    const message = MessageFormatter.updateFile(files, project_id, options);
    return this.create(message);
  };

  statics.deleteFile = function(files, project_id, options) {
    const message = MessageFormatter.deleteFile(files, project_id, options);
    return this.create(message);
  };

  statics.moveFile = function(files, project_id, options) {
    const message = MessageFormatter.moveFile(files, project_id, options);
    return this.create(message);
  };

  return mongoose.model('Message', MessageSchema);
};
