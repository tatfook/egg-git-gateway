'use strict';

const Controller = require('./node');

const create_rule = {
  branch: { type: 'string', default: 'master', required: false },
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
    required: false,
  },
};

class FolderController extends Controller {
  async create() {
    this.ctx.validate(create_rule);
    const path = this.ctx.params.path;
    const project = await this.get_writable_project();
    await this.throw_if_parent_node_not_exist();
    let folder = await this.ctx.model.File
      .get_by_path(path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    this.throw_if_exists(folder);
    folder = new this.ctx.model.File();
    folder.set({
      name: this.get_file_name(),
      type: 'tree',
      path,
    });

    const commit_options = {
      commit_message: this.ctx.request.body.commit_message,
      author: this.ctx.user.username,
    };
    const commit = await this.ctx.model.Commit
      .create_folder(folder, project._id, commit_options)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    console.log(commit);

    await folder.save().catch(err => {
      this.ctx.logger.error(err);
      this.ctx.throw(500);
    });

    await this.send_message(commit._id, project._id);
    this.ctx.status = 201;
  }
  async remove() { return ''; }
  async rename() { return ''; }
}

module.exports = FolderController;
