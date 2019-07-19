'use strict';

/**
 * @param {Egg.Application} app - egg application
 */

module.exports = app => {
  const { router, controller } = app;
  const url_prefix = app.config.url_prefix;
  if (url_prefix) { router.prefix(url_prefix); }

  router.get('home', '/', controller.home.index);

  router.get('/accounts', controller.account.show);
  router.post('/accounts', controller.account.create);
  router.del('/accounts/:kw_username', controller.account.remove);

  router.post('/projects/user/:kw_username', controller.project.create);
  router.put('/projects/:path/visibility', controller.project.updateVisibility);
  router.del('/projects/:path', controller.project.remove);
  router.get('/projects/:path/exist', controller.project.exist);
  router.get('/projects/:path/commits/:file_path', controller.project.getCommits);

  router.get('/projects/:project_path/tree/:path', controller.tree.show);
  router.get('/projects/:project_path/tree/', controller.tree.root);

  router.get('/projects/:project_path/files/:path', controller.file.show);
  router.post('/projects/:project_path/files/:path', controller.file.create);
  router.post('/projects/:project_path/files', controller.file.create_many);
  router.put('/projects/:project_path/files/:path', controller.file.update);
  router.put('/projects/:project_path/files/:path/move', controller.file.move);
  router.del('/projects/:project_path/files/:path', controller.file.remove);

  router.post('/projects/:project_path/folders/:path', controller.folder.create);
  router.put('/projects/:project_path/folders/:path/move', controller.folder.move);
  router.del('/projects/:project_path/folders/:path', controller.folder.remove);
};
