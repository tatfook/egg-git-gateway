'use strict';

class CommitFormatter {
  static output(actions, project_id, commit_message, options) {
    return {
      branch: options.branch,
      id: project_id,
      author_name: options.author,
      actions,
      commit_message,
    };
  }

  static wrap_create_action(file, options) {
    return {
      action: 'create',
      file_path: file.path_without_namespace,
      content: file.content,
      encoding: options.encoding,
    };
  }

  static create_file(files, project_id, options) {
    let actions;
    let commit_message;

    if (files instanceof Array) {
      actions = files.map(function(file) {
        return this.wrap_create_action(file);
      });
      commit_message = `${options.author} commit files`;
    } else {
      actions = [ this.wrap_create_action(files) ];
      commit_message = `${options.author} create file ${files.path}`;
    }

    commit_message = options.commit_message || commit_message;
    return this.output(actions, project_id, commit_message, options);
  }
}

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const ActionSchema = new Schema({
    action: String,
    file_path: String,
    previous_path: String,
    content: String,
    encoding: { type: String, default: 'text' },
  });

  const CommitSchema = new Schema({
    branch: { type: String, default: 'master' },
    id: String, // URL-encoded project git_path or project_id
    actions: [ ActionSchema ],
    commit_message: String,
    author_name: String,
  });

  const statics = CommitSchema.statics;

  statics.create_file = async function(files, project_id, options) {
    const commit = CommitFormatter.create_file(files, project_id, options);
    return await this.create(commit)
      .catch(err => {
        console.log(`fail to create commit ${commit}`);
        throw err;
      });
  };

  return mongoose.model('Commit', CommitSchema);
};
