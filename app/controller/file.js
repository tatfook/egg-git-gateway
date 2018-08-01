'use strict';

const Controller = require('egg').Controller;
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

    const deleting = this.throw_if_exists(file);
    if (!deleting) { file = new this.ctx.model.File(); }
    file.set({
      name: this.get_file_name(),
      content: this.ctx.request.body.content,
      status: 'creating',
      path,
    });

    const commit_options = {
      commit_message: this.ctx.request.body.commit_message,
      encoding: this.ctx.request.body.encoding,
      author: this.ctx.user.username,
    };
    await this.ctx.model.Commit
      .create_file(file, project._id, commit_options)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await file.save().catch(err => {
      this.ctx.logger.error(err);
      this.ctx.throw(500);
    });
    this.ctx.status = 201;
  }

  async update() {
    this.ctx.validate(update_rule);
    const path = this.ctx.params.path;
    console.log(this.ctx.params.branch);
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
      status: 'updating',
    });

    const commit_options = {
      commit_message: this.ctx.request.body.commit_message,
      encoding: this.ctx.request.body.encoding,
      author: this.ctx.user.username,
    };
    await this.ctx.model.Commit
      .update_file(file, project._id, commit_options)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await file.save().catch(err => {
      this.ctx.logger.error(err);
      this.ctx.throw(500);
    });
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
    await this.ctx.model.Commit
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
    this.ctx.status = 204;
  }

  async move() {
    this.ctx.validate(move_rule);
    this.throw_if_can_not_move();
    const project = await this.get_writable_project();
    await this.throw_if_parent_node_not_exist();
    const file = await this.ctx.model.File
      .get_by_path_from_db(this.ctx.request.body.previous_path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    await this.throw_if_not_exist(file);

    const content = this.ctx.request.body.content;
    if (content) { file.content = content; }
    file.status = 'moving';
    file.previous_path = file.path;
    file.path = this.ctx.params.path;
    file.name = this.get_file_name();

    const commit_options = {
      commit_message: this.ctx.request.body.commit_message,
      encoding: this.ctx.request.body.encoding,
      author: this.ctx.user.username,
    };
    await this.ctx.model.Commit
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
    this.ctx.status = 204;
  }

  async dump() {
    const file = await this.load_from_gitlab(this.ctx.params.path, false);
    this.ctx.body = { content: file.content };
  }

  get_file_name(path) {
    path = path || this.ctx.params.path;
    return this.ctx.model.File.get_file_name(path);
  }

  get_project_path(path) {
    path = path || this.ctx.params.path;
    return this.ctx.model.File.get_project_path(path);
  }

  filter_file_or_folder(file) {
    const is_folder = (file.name === '.gitignore.md' || file.name === '.gitkeep');
    if (is_folder) {
      return {
        name: file.path.match(/[^\/]+$/)[0],
        type: 'tree',
        path: file.path.replace(`/${file.name}`, ''),
      };
    }
    file.type = 'blob';
    return file;
  }

  async load_from_gitlab() {
    const project_path = this.get_project_path();
    const project = await this.ctx.model.Project
      .get_by_path(project_path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }

    let file = await this.service.gitlab
      .load_file(project._id, this.ctx.params.path)
      .catch(err => {
        this.ctx.logger.error(err);
        if (err.response.status === 404) {
          this.throw_if_not_exist();
        }
        this.ctx.throw(500);
      });
    this.throw_if_not_exist(file);

    file.path = this.ctx.params.path;
    file = this.filter_file_or_folder(file);
    await this.ctx.model.File.create(file)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    return file;
  }

  throw_if_not_exist(file) {
    const errMsg = 'File not found';
    if (empty(file)) { this.ctx.throw(404, errMsg); }
    if (file.status === 'deleting' || file.type === 'tree') { this.ctx.throw(404, errMsg); }
  }

  throw_if_exists(file) {
    if (!empty(file)) {
      const deleting = (file.status === 'deleting');
      if (!deleting) { this.ctx.throw(409); }
      return deleting;
    }
  }

  throw_if_can_not_move() {
    const new_path = this.ctx.params.path;
    const previous_path = this.ctx.request.body.previous_path;
    const project_of_new_path = this.get_project_path(new_path);
    const project_of_previous_path = this.get_project_path(previous_path);
    const inside_the_same_project = (project_of_new_path === project_of_previous_path);
    if (!inside_the_same_project) {
      const errMsg = 'Can only move inside the same project';
      this.ctx.throw(400, errMsg);
    }
  }

  async throw_if_parent_node_not_exist() {
    const errMsg = await this.ctx.model.File
      .ensure_parent_exist(this.ctx.params.path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (errMsg) { this.ctx.throw(404, errMsg); }
  }

  async get_project(project_path) {
    project_path = project_path || this.get_project_path();
    const project = await this.ctx.model.Project
      .get_by_path(project_path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }
    return project;
  }

  async get_readable_project(project_path) {
    const project = await this.get_project(project_path);
    const white_list = this.config.file.white_list;
    if (white_list.includes(project.sitename)) {
      await this.ctx.ensurePermission(project.site_id, 'r');
    }
    return project;
  }

  async get_writable_project(project_path) {
    const project = await this.get_project(project_path);
    await this.ctx.ensurePermission(project.site_id, 'rw');
    return project;
  }
}

module.exports = FileController;
