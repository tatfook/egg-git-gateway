'use strict';

const MessageFormatter = require('../lib/message_formatter');

module.exports = app => {
  const { mongoose } = app;
  const Schema = mongoose.Schema;
  const logger = app.logger;

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

  statics.create_file = function(files, project_id, options) {
    const message = MessageFormatter.create_file(files, project_id, options);
    return this.create(message)
      .catch(err => {
        logger.error(`failed to create message ${message}`);
        throw err;
      });
  };

  statics.update_file = function(files, project_id, options) {
    const message = MessageFormatter.update_file(files, project_id, options);
    return this.create(message)
      .catch(err => {
        logger.error(`failed to create message ${message}`);
        throw err;
      });
  };

  statics.delete_file = function(files, project_id, options) {
    const message = MessageFormatter.delete_file(files, project_id, options);
    return this.create(message)
      .catch(err => {
        logger.error(`failed to create message ${message}`);
        throw err;
      });
  };

  statics.move_file = function(files, project_id, options) {
    const message = MessageFormatter.move_file(files, project_id, options);
    return this.create(message)
      .catch(err => {
        logger.error(`failed to create message ${message}`);
        throw err;
      });
  };

  return mongoose.model('Message', MessageSchema);
};
