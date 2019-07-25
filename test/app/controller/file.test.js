'use strict';

const { app, assert } = require('egg-mock/bootstrap');
const faker = require('faker');

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

describe('test/app/controller/file.test.js', () => {
  it('should post /projects/:project_path/files/:path to create a file', async () => {
    const mockMethod = app.mock.service.common.success;
    app.mockService('keepwork', 'ensurePermission', mockMethod);
    app.mockService('keepwork', 'getUserProfile', mockMethod);

    const fileName = faker.system.fileName();
    const path = `${project.path}/${fileName}`;
    const encodedFilePath = encodeURIComponent(path);
    const content = faker.lorem.paragraphs();
    const file = { content };
    await app.httpRequest()
      .post(`/projects/${encodedProjectPath}/files/${encodedFilePath}`)
      .send(file)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const fileGetFromDB = await app.model.Node.findOne({ project_id: project._id, path });
    assert(fileGetFromDB);
    assert(fileGetFromDB.content = content);
    assert(fileGetFromDB.account_id === account._id);
    assert(fileGetFromDB.project_id === project._id);
    assert(fileGetFromDB.path === path);
    assert(fileGetFromDB.name === fileName);
  });

  it('should get /projects/:project_path/files/:path to get a file', async () => {
    const mockMethod = app.mock.service.common.success;
    app.mockService('keepwork', 'ensurePermission', mockMethod);
    app.mockService('keepwork', 'getUserProfile', mockMethod);

    const file = await factory.create('Node', option);
    const encodedFilePath = encodeURIComponent(file.path);

    const res = await app.httpRequest()
      .get(`/projects/${encodedProjectPath}/files/${encodedFilePath}`)
      .expect(200);

    assert(res.body._id === (file._id).toString());
    assert(res.body.content === file.content);
  });

  it('should put /projects/:project_path/files/:path to update a file', async () => {
    const mockMethod = app.mock.service.common.success;
    app.mockService('keepwork', 'ensurePermission', mockMethod);
    app.mockService('keepwork', 'getUserProfile', mockMethod);

    const file = await factory.create('Node', option);
    const encodedFilePath = encodeURIComponent(file.path);
    const newContent = faker.lorem.sentence();

    await app.httpRequest()
      .put(`/projects/${encodedProjectPath}/files/${encodedFilePath}`)
      .send({ content: newContent })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const fileGetFromDB = await app.model.Node.findOne({ _id: file._id });
    assert(fileGetFromDB.content === newContent);
  });

  it('should put /projects/:project_path/files/:path/move to move a file', async () => {
    const mockMethod = app.mock.service.common.success;
    app.mockService('keepwork', 'ensurePermission', mockMethod);
    app.mockService('keepwork', 'getUserProfile', mockMethod);

    const file = await factory.create('Node', option);
    const encodedFilePath = encodeURIComponent(file.path);
    const new_path = 'test_file/test_file/test_new.md';

    await app.httpRequest()
      .put(`/projects/${encodedProjectPath}/files/${encodedFilePath}/move`)
      .send({ new_path })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const fileGetFromDB = await app.model.Node.findOne({ _id: file._id });
    assert(fileGetFromDB.path === new_path);
  });

  it('should delete /projects/:project_path/files/:path to remove a file', async () => {
    const mockMethod = app.mock.service.common.success;
    app.mockService('keepwork', 'ensurePermission', mockMethod);
    app.mockService('keepwork', 'getUserProfile', mockMethod);

    const file = await factory.create('Node', option);
    const encodedFilePath = encodeURIComponent(file.path);

    await app.httpRequest()
      .del(`/projects/${encodedProjectPath}/files/${encodedFilePath}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const fileGetFromDB = await app.model.Node.findOne({ _id: file._id });
    assert(fileGetFromDB === null);
  });
});
