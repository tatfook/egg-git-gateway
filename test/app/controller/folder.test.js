'use strict';

const { app, assert } = require('egg-mock/bootstrap');
// const faker = require('faker');

const FOLDER_TYPE = 'tree';

let factory;
let project;
let account;
let token;
let encodedProjectPath;
let option;

before(async () => {
  factory = app.factory;
  project = await factory.create('Project');
  account = await app.model.Account.findOne({ _id: project.account_id });
  encodedProjectPath = encodeURIComponent(project.path);
  token = app.mock.utils.token.get(account);
  option = {
    project_id: project._id,
    account_id: account._id,
  };
});

beforeEach(() => {
  app.mock.axios.keepwork.set(200, 64);
});

describe('test/app/controller/folder.test.js', () => {
  it('should post /projects/:project_path/folders/:path to create a folder', async () => {
    const path = 'test_folder/test_folder/new_folder1';
    const encodedFolderPath = encodeURIComponent(path);

    await app.httpRequest()
      .post(`/projects/${encodedProjectPath}/folders/${encodedFolderPath}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const folderGetFromDB = await app.model.Node.findOne({ project_id: project._id, path });
    assert(folderGetFromDB);
    assert(folderGetFromDB.type === FOLDER_TYPE);
  });

  it('should delete /projects/:project_path/folders/:path to remove a folder', async () => {
    const folder = await factory.create('Node', option, { isFolder: true });
    const { path } = folder;
    const encodedFolderPath = encodeURIComponent(path);

    await app.httpRequest()
      .del(`/projects/${encodedProjectPath}/folders/${encodedFolderPath}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const folderGetFromDB = await app.model.Node.findOne({ project_id: project._id, path });
    assert(folderGetFromDB === null);
  });

  it('should delete /projects/:project_path/folders/:path to remove a folder', async () => {
    const folder = await factory.create('Node', option);
    const { path } = folder;
    const encodedFolderPath = encodeURIComponent(path);

    await app.httpRequest()
      .del(`/projects/${encodedProjectPath}/folders/${encodedFolderPath}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const folderGetFromDB = await app.model.Node.findOne({ project_id: project._id, path });
    assert(folderGetFromDB === null);
  });
});
