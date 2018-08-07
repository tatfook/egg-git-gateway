'use strict';

const Controller = require('./node');
const { empty } = require('../helper');

const create_rule = {
  branch: { type: 'string', default: 'master', required: false },
  content: { type: 'string', required: false },
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
    required: false,
  },
};

const update_rule = {
  branch: { type: 'string', default: 'master', required: false },
  content: 'string',
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
    required: false,
  },
};

const move_rule = {
  previous_path: 'string',
  branch: { type: 'string', default: 'master', required: false },
  content: { type: 'string', required: false },
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
    required: false,
  },
};

class FileController extends Controller {
  async show() {
    const path = this.ctx.params.path;
    const from_cache = !this.ctx.query.refresh_cache;
    let file = await this.ctx.model.File
      .get_by_path(path, from_cache)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    if (empty(file)) {
      file = await this.load_from_gitlab();
    }

    this.throw_if_not_exist(file);
    this.ctx.body = { content: file.content };
  }

  async create() {
    this.ctx.validate(create_rule);
    const path = this.ctx.params.path;
    const project = await this.get_writable_project();
    await this.throw_if_parent_node_not_exist();
    let file = await this.ctx.model.File
      .get_by_path(path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    this.throw_if_exists(file);
    file = new this.ctx.model.File();
    file.set({
      name: this.get_file_name(),
      content: this.ctx.request.body.content,
      path,
    });

    const commit_options = {
      commit_message: this.ctx.request.body.commit_message,
      encoding: this.ctx.request.body.encoding,
      author: this.ctx.user.username,
    };
    const commit = await this.ctx.model.Commit
      .create_file(file, project._id, commit_options)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await file.save().catch(err => {
      this.ctx.logger.error(err);
      this.ctx.throw(500);
    });

    await this.send_message(commit._id, project._id);
    this.ctx.status = 201;
  }

  async update() {
    this.ctx.validate(update_rule);
    const path = this.ctx.params.path;
    const project = await this.get_writable_project();
    const file = await this.ctx.model.File
      .get_by_path_from_db(path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    this.throw_if_not_exist(file);
    file.set({
      content: this.ctx.request.body.content,
    });

    const commit_options = {
      commit_message: this.ctx.request.body.commit_message,
      encoding: this.ctx.request.body.encoding,
      author: this.ctx.user.username,
    };
    const commit = await this.ctx.model.Commit
      .update_file(file, project._id, commit_options)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await file.save().catch(err => {
      this.ctx.logger.error(err);
      this.ctx.throw(500);
    });

    await this.send_message(commit._id, project._id);
    this.ctx.status = 204;
  }

  async remove() {
    const path = this.ctx.params.path;
    const project = await this.get_writable_project();
    const file = await this.ctx.model.File
      .get_by_path_from_db(path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    await this.throw_if_not_exist(file);

    const commit_options = {
      commit_message: this.ctx.request.body.commit_message,
      author: this.ctx.user.username,
    };
    const commit = await this.ctx.model.Commit
      .delete_file(file, project._id, commit_options)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await this.ctx.model.File
      .delete_and_release_cache(file)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await this.send_message(commit._id, project._id);
    this.ctx.status = 204;
  }

  async move() {
    this.ctx.validate(move_rule);
    const project = await this.get_writable_project();
    await this.throw_if_can_not_move();
    const file = await this.ctx.model.File
      .get_by_path_from_db(this.ctx.request.body.previous_path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    this.throw_if_not_exist(file);

    const content = this.ctx.request.body.content;
    if (content) { file.content = content; }
    file.previous_path = file.path;
    file.path = this.ctx.params.path;
    file.name = this.get_file_name();

    const commit_options = {
      commit_message: this.ctx.request.body.commit_message,
      encoding: this.ctx.request.body.encoding,
      author: this.ctx.user.username,
    };
    const commit = await this.ctx.model.Commit
      .move_file(file, project._id, commit_options)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await this.ctx.model.File
      .move(file).catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await this.send_message(commit._id, project._id);
    this.ctx.status = 204;
  }
}

module.exports = FileController;
