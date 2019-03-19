'use strict';

class CommitFormatter {
  static output(actions, project_id, options) {
    return {
      branch: options.branch || 'master',
      visibility: options.visibility,
      project_id,
      author_name: options.author || null,
      commit_message: options.commit_message,
      actions,
    };
  }

  static formatCreateAction(file, options) {
    return {
      _id: file._id,
      action: 'create',
      file_path: file.path,
      content: file.content,
      encoding: options.encoding || 'text',
    };
  }

  static formatUpdateAction(file, options) {
    return {
      _id: file._id,
      action: 'update',
      file_path: file.path,
      content: file.content,
      encoding: options.encoding || 'text',
    };
  }

  static formatDeleteAction(file) {
    const file_path = file.path;
    return {
      _id: file._id,
      action: 'delete',
      file_path,
    };
  }

  static formatMoveAction(file, options) {
    return {
      _id: file._id,
      action: 'move',
      file_path: file.path,
      previous_path: file.previous_path,
      encoding: options.encoding || 'text',
      content: file.content,
    };
  }

  static formatActions(files, action_formatter, options) {
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

  static createFile(files, project_id, options) {
    const actions = this.formatActions(files, this.formatCreateAction, options);
    let default_message = `${options.author} create file ${files.path}`;
    if (files instanceof Array) { default_message = `${options.author} create files`; }
    options.commit_message = options.commit_message || default_message;
    return this.output(actions, project_id, options);
  }

  static updateFile(files, project_id, options) {
    const actions = this.formatActions(files, this.formatUpdateAction, options);
    let default_message = `${options.author} update file ${files.path}`;
    if (files instanceof Array) { default_message = `${options.author} update files`; }
    options.commit_message = options.commit_message || default_message;
    return this.output(actions, project_id, options);
  }

  static deleteFile(files, project_id, options) {
    const actions = this.formatActions(files, this.formatDeleteAction, options);
    let default_message = `${options.author} delete file ${files.path}`;
    if (files instanceof Array) { default_message = `${options.author} delete files`; }
    options.commit_message = options.commit_message || default_message;
    return this.output(actions, project_id, options);
  }

  static moveFile(files, project_id, options) {
    const actions = this.formatActions(files, this.formatMoveAction, options);
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
    visibility: { type: String, default: 'public' },
    project_id: String,
    actions: [ ActionSchema ],
    commit_message: String,
    author_name: String,
  }, { timestamps: true });

  const statics = CommitSchema.statics;

  statics.createFile = function(files, project_id, options) {
    const commit = CommitFormatter.createFile(files, project_id, options);
    return this.create(commit)
      .catch(err => {
        logger.error(`failed to create commit ${commit}`);
        throw err;
      });
  };

  statics.updateFile = function(files, project_id, options) {
    const commit = CommitFormatter.updateFile(files, project_id, options);
    return this.create(commit)
      .catch(err => {
        logger.error(`failed to create commit ${commit}`);
        throw err;
      });
  };

  statics.deleteFile = function(files, project_id, options) {
    const commit = CommitFormatter.deleteFile(files, project_id, options);
    return this.create(commit)
      .catch(err => {
        logger.error(`failed to create commit ${commit}`);
        throw err;
      });
  };

  statics.moveFile = function(files, project_id, options) {
    const commit = CommitFormatter.moveFile(files, project_id, options);
    return this.create(commit)
      .catch(err => {
        logger.error(`failed to create commit ${commit}`);
        throw err;
      });
  };

  return mongoose.model('Commit', CommitSchema);
};
