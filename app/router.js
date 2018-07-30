'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  router.resources('home', '/', controller.home);

  router.post('/accounts', controller.account.create);
  router.delete('/accounts/:kw_username', controller.account.destroy);

  router.post('/projects/user/:kw_username', controller.project.create);
  router.put('/projects/:path/visibility', controller.project.update_visibility);
  router.delete('/projects/:path', controller.project.destroy);

  router.get('/tree/:path', controller.tree.show);

  router.get('/files/:path', controller.file.show);
  router.post('/files/:path', app.jwt, controller.file.create);
  router.delete('/files/:path', app.jwt, controller.file.remove);
};
