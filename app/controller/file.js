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
    const project = await this.get_readable_project();
    const path = this.ctx.params.path;
    const from_cache = !this.ctx.query.refresh_cache;
    let file = await this.ctx.model.File
      .get_by_path(path, from_cache)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    if (empty(file)) {
      file = await this.load_from_gitlab(project);
    }

    this.throw_if_not_exist(file);
    this.ctx.body = { content: file.content || '' };
  }

  async create() {
    this.ctx.validate(create_rule);
    this.validate_file_path();
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
      project_id: project._id,
      account_id: project.account_id,
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
    this.throw_if_not_exist(file);

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
    this.validate_file_path();
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

  async dump() {
    const file = await this.load_from_gitlab();
    this.ctx.body = { content: file.content };
  }

  async load_from_gitlab(project) {
    if (!project) {
      const project_path = this.get_project_path();
      project = await this.ctx.model.Project
        .get_by_path(project_path)
        .catch(err => {
          this.ctx.logger.error(err);
          this.ctx.throw(500);
        });
    }
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }

    let file = await this.service.gitlab
      .load_file(project._id, this.ctx.params.path)
      .catch(err => {
        this.ctx.logger.error(err);
        if (err.response.status === 404) {
          this.throw_if_not_exist(null);
        }
        this.ctx.throw(500);
      });
    this.throw_if_not_exist(file);

    file.path = this.ctx.params.path;
    file = this.filter_file_or_folder(file);
    file.project_id = project._id;
    file.account_id = project.account_id;
    await this.ctx.model.File.create(file)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    return file;
  }
}

module.exports = FileController;
