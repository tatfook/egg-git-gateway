'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  const url_prefix = app.config.url_prefix;
  if (url_prefix) { router.prefix(url_prefix); }

  router.resources('home', '/', controller.home);

  router.post('/accounts', controller.account.create);
  router.del('/accounts/:kw_username', controller.account.remove);

  router.post('/projects/user/:kw_username', controller.project.create);
  router.put('/projects/:path/visibility', controller.project.update_visibility);
  router.del('/projects/:path', controller.project.remove);

  router.get('/tree/:path', controller.tree.show);

  router.get('/files/:path', app.jwt, controller.file.show);
  router.post('/files/:path', app.jwt, controller.file.create);
  router.put('/files/:path', app.jwt, controller.file.update);
  router.del('/files/:path', app.jwt, controller.file.remove);
  router.put('/files/:path/move', app.jwt, controller.file.move);

  router.post('/folders/:path', app.jwt, controller.folder.create);
  router.del('/folders/:path', app.jwt, controller.folder.remove);
};
