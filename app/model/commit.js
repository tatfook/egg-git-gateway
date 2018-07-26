'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const ActionSchema = new Schema({
    action: String,
    file_path: String,
    previous_path: String,
    content: String,
  });

  const CommitSchema = new Schema({
    branch: { type: String, default: 'master' },
    id: String, // URL-encoded project git_path or project_id
    actions: [ ActionSchema ],
    commit_message: String,
    author: String,
  });

  // const statics = CommitSchema.statics;

  // statics.create_file = async function(file) {
  // };

  return mongoose.model('Commit', CommitSchema);
};
