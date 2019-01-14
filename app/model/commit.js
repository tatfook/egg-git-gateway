'use strict';

const fast_JSON = require('fast-json-stringify');

class CommitFormatter {
  static output(actions, project_id, options) {
    return {
      branch: options.branch || 'master',
      id: project_id,
      author_name: options.author || null,
      commit_message: options.commit_message,
      actions,
    };
  }

  static format_create_action(file, options) {
    return {
      _id: file._id,
      action: 'create',
      file_path: file.path,
      content: file.content,
      encoding: options.encoding || 'text',
    };
  }

  static format_update_action(file, options) {
    return {
      _id: file._id,
      action: 'update',
      file_path: file.path,
      content: file.content,
      encoding: options.encoding || 'text',
    };
  }

  static format_delete_action(file) {
    const file_path = file.path;
    return {
      _id: file._id,
      action: 'delete',
      file_path,
    };
  }

  static format_move_action(file, options) {
    return {
      _id: file._id,
      action: 'move',
      file_path: file.path,
      previous_path: file.previous_path,
      encoding: options.encoding || 'text',
      content: file.content,
    };
  }

  static format_actions(files, action_formatter, options) {
    let actions;
    if (files instanceof Array) {
      actions = [];
      for (const file of files) {
        if (file.type === 'tree') { continue; }
        actions.push(action_formatter(file, options));
      }
    } else {
      actions = [ action_formatter(files, options) ];
    }
    return actions;
  }

  static create_file(files, project_id, options) {
    const actions = this.format_actions(files, this.format_create_action, options);
    let default_message = `${options.author} create file ${files.path}`;
    if (files instanceof Array) { default_message = `${options.author} create files`; }
    options.commit_message = options.commit_message || default_message;
    return this.output(actions, project_id, options);
  }

  static update_file(files, project_id, options) {
    const actions = this.format_actions(files, this.format_update_action, options);
    let default_message = `${options.author} update file ${files.path}`;
    if (files instanceof Array) { default_message = `${options.author} update files`; }
    options.commit_message = options.commit_message || default_message;
    return this.output(actions, project_id, options);
  }

  static delete_file(files, project_id, options) {
    const actions = this.format_actions(files, this.format_delete_action, options);
    let default_message = `${options.author} delete file ${files.path}`;
    if (files instanceof Array) { default_message = `${options.author} delete files`; }
    options.commit_message = options.commit_message || default_message;
    return this.output(actions, project_id, options);
  }

  static move_file(files, project_id, options) {
    const actions = this.format_actions(files, this.format_move_action, options);
    let default_message =
      `${options.author} move file from ${files.previous_path} to ${files.path}`;
    if (files instanceof Array) { default_message = `${options.author} move files`; }
    options.commit_message = options.commit_message || default_message;
    return this.output(actions, project_id, options);
  }
}

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const logger = app.logger;

  const ActionSchema = new Schema({
    _id: String,
    action: String,
    file_path: String,
    previous_path: String,
    content: String,
    encoding: { type: String, default: 'text' },
  });

  const CommitSchema = new Schema({
    branch: { type: String, default: 'master' },
    id: String,
    actions: [ ActionSchema ],
    commit_message: String,
    author_name: String,
  }, { timestamps: true });

  const stringify = fast_JSON({
    title: 'stringify commit',
    type: 'object',
    properties: {
      id: { type: 'string' },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            action: { type: 'string' },
            file_path: { type: 'string' },
            previous_path: { type: 'string' },
            content: { type: 'string' },
          },
        },
      },
    },
  });

  const statics = CommitSchema.statics;

  statics.create_file = function(files, project_id, options) {
    const commit = CommitFormatter.create_file(files, project_id, options);
    return this.create(commit)
      .catch(err => {
        logger.error(`failed to create commit ${commit}`);
        throw err;
      });
  };

  statics.update_file = function(files, project_id, options) {
    const commit = CommitFormatter.update_file(files, project_id, options);
    return this.create(commit)
      .catch(err => {
        logger.error(`failed to create commit ${commit}`);
        throw err;
      });
  };

  statics.delete_file = function(files, project_id, options) {
    const commit = CommitFormatter.delete_file(files, project_id, options);
    return this.create(commit)
      .catch(err => {
        logger.error(`failed to create commit ${commit}`);
        throw err;
      });
  };

  statics.move_file = function(files, project_id, options) {
    const commit = CommitFormatter.move_file(files, project_id, options);
    return this.create(commit)
      .catch(err => {
        logger.error(`failed to create commit ${commit}`);
        throw err;
      });
  };

  CommitSchema.virtual('stringify').get(function() {
    return stringify(this);
  });

  return mongoose.model('Commit', CommitSchema);
};
