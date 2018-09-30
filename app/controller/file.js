'use strict';

const Controller = require('./node');
const { empty } = require('../lib/helper');

const create_rule = {
  branch: { type: 'string', default: 'master', required: false },
  content: { type: 'string', required: false, allowEmpty: true },
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
  content: { type: 'string', allowEmpty: true },
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
    required: false,
  },
};

const move_rule = {
  new_path: 'string',
  branch: { type: 'string', default: 'master', required: false },
  content: { type: 'string', required: false, allowEmpty: true },
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
    required: false,
  },
};

class FileController extends Controller {
  /**
  * @api {get} /projects/:encoded_project_path/files/:encoded_path get
  * @apiName GetFile
  * @apiGroup File
  * @apiDescription To get a file
  * @apiPermission authorized user
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'folder%2Ffolder'
  * @apiParam {Boolean} [refresh_cache=false]  Whether refresh the cache of this file
  */
  async show() {
    const project = await this.get_readable_project();
    const path = this.ctx.params.path;
    const from_cache = !this.ctx.query.refresh_cache;
    let file = await this.ctx.model.Node
      .get_by_path(project._id, path, from_cache)
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

  /**
  * @api {post} /projects/:encoded_project_path/files/:encoded_path create
  * @apiName CreateFile
  * @apiGroup File
  * @apiDescription To create a file
  * @apiPermission authorized user
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'folder%2Ffolder'
  * @apiParam {String} [content] Content of the file
  */
  async create() {
    this.ctx.validate(create_rule);
    const path = this.ctx.params.path;
    const project = await this.get_writable_project();
    await this.throw_if_node_exist(project._id, path);
    await this.ensure_parent_exist(project.account_id, project._id, path);
    const file = new this.ctx.model.Node({
      name: this.get_file_name(path),
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

    const es_message = {
      action: 'create_file',
      path: file.path,
    };

    await this.send_message(commit._id, project._id, es_message);
    this.created();
  }

  /**
  * @api {put} /projects/:encoded_project_path/files/:encoded_path update
  * @apiName UpdateFile
  * @apiGroup File
  * @apiDescription To update a file
  * @apiPermission authorized user
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'folder%2Ffolder'
  * @apiParam {String} content Content of the file
  */
  async update() {
    this.ctx.validate(update_rule);
    const path = this.ctx.params.path;
    const project = await this.get_writable_project();
    const file = await this.ctx.model.Node
      .get_by_path_from_db(project._id, path)
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

    const es_message = {
      action: 'update_file',
      path: file.path,
    };

    await this.send_message(commit._id, project._id, es_message);
    this.updated();
  }

  /**
  * @api {delete} /projects/:encoded_project_path/files/:encoded_path remove
  * @apiName RemoveFile
  * @apiGroup File
  * @apiDescription To remove a file
  * @apiPermission authorized
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'folder%2Ffolder'
  */
  async remove() {
    const path = this.ctx.params.path;
    const project = await this.get_writable_project();
    const file = await this.ctx.model.Node
      .get_by_path_from_db(project._id, path)
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

    await this.ctx.model.Node
      .delete_and_release_cache(file)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    const es_message = {
      action: 'remove_file',
      path: file.path,
    };

    await this.send_message(commit._id, project._id, es_message);
    this.deleted();
  }

  /**
  * @api {put} /projects/:encoded_project_path/files/:encoded_path/move move
  * @apiName MoveFile
  * @apiGroup File
  * @apiDescription To move a file
  * @apiPermission authorized user
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'username%2Fsitename%2Fprevious%2Findex.md'
  * @apiParam {String} new_path New path of the file such as 'username/sitename/new/index.md'
  * @apiParam {String} [content] Content of the file
  */
  async move() {
    this.ctx.validate(move_rule);
    const previous_path = this.ctx.params.path;
    const new_path = this.ctx.params.path = this.ctx.request.body.new_path;
    const project = await this.get_writable_project();
    const file = await this.ctx.model.Node
      .get_by_path_from_db(project._id, previous_path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    this.throw_if_not_exist(file);
    await this.throw_if_node_exist(project._id, new_path);
    await this.ensure_parent_exist(project.account_id, project._id, new_path);

    const content = this.ctx.request.body.content;
    if (content) { file.content = content; }
    file.previous_path = previous_path;
    file.path = new_path;
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

    await this.ctx.model.Node
      .move(file).catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    const es_message = {
      action: 'move_file',
      path: file.path,
      previous_path: file.previous_path,
    };

    await this.send_message(commit._id, project._id, es_message);
    this.moved();
  }

  async dump() {
    const file = await this.load_from_gitlab();
    this.ctx.body = { content: file.content };
  }

  async load_from_gitlab(project) {
    if (!project) {
      project = await this.get_project();
    }
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }

    const file = await this.service.gitlab
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
    file.project_id = project._id;
    file.account_id = project.account_id;
    await this.ctx.model.Node.create(file)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    return file;
  }

  async migrate() {
    this.ctx.ensureAdmin();
    const path = this.ctx.params.path;
    const project = await this.get_project();
    await this.throw_if_node_exist(project._id, path);
    await this.ensure_parent_exist(project.account_id, project._id, path);
    await this.ctx.model.Node.create({
      name: this.get_file_name(path),
      content: this.ctx.request.body.content,
      path,
      project_id: project._id,
      account_id: project.account_id,
    }).catch(err => {
      this.ctx.logger.error(err);
      this.ctx.throw(500);
    });
    this.created();
  }
}

module.exports = FileController;
