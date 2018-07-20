'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  router.resources('home', '/', controller.home);

  router.post('/accounts', controller.account.create);
  router.delete('/accounts/:user_id', controller.account.destroy);

  router.post('/projects/user/:user_id', controller.project.create);
  router.put('/projects/:path/visibility', controller.project.update_visibility);
  router.delete('/projects/:path', controller.project.destroy);
};
