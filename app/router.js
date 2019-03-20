'use strict';

/**
 * @param {Egg.Application} app - egg application
 */

module.exports = app => {
  const { router, controller } = app;
  const url_prefix = app.config.url_prefix;
  if (url_prefix) { router.prefix(url_prefix); }

  const {
    account, home, project, tree, file, folder,
  } = controller;

  router.get('home', '/', home.index);

  router.resources('/accounts', account);

  router.post('/projects/user/:username', project.create);
  router.put('/projects/:path/visibility', project.updateVisibility);
  router.del('/projects/:path', project.destroy);
  router.get('/projects/:path/exist', project.exist);

  router.get('/projects/:project_path/tree/:path', tree.show);
  router.get('/projects/:project_path/tree/', tree.root);

  router.get('/projects/:project_path/files/:path', file.show);
  router.post('/projects/:project_path/files/:path', file.create);
  router.post('/projects/:project_path/files', file.create_many);
  router.put('/projects/:project_path/files/:path', file.update);
  router.put('/projects/:project_path/files/:path/move', file.move);
  router.del('/projects/:project_path/files/:path', file.destroy);

  router.post('/projects/:project_path/folders/:path', folder.create);
  router.put('/projects/:project_path/folders/:path/move', folder.move);
  router.del('/projects/:project_path/folders/:path', folder.remove);

  // router.delete('/projects/:project_path/clear', controller.file.clearProject);
  // router.post('/projects/:project_path/migrate/files/:path', controller.file.migrate);
  // router.post('/projects/:project_path/migrate/files/', controller.file.migrate_many);
};
