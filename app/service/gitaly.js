'use strict';

const Service = require('egg').Service;

let cycleIndexes;

const formatRepo = (storage_name, namespace, repo_name) => {
  return {
    storage_name,
    relative_path: `${namespace}/${repo_name}.git`,
  };
};

class GitalyService extends Service {
  get client() {
    return this.ctx.grpc.gitaly;
  }

  get auth_meta() {
    return { authorization: this.config.gitaly.authorization };
  }

  get storages() {
    return this.config.gitaly.storages;
  }

  allocateStorage() {
    if (!cycleIndexes) {
      cycleIndexes = this.ctx.helper.cycleInt(this.storages.length);
    }
    const index = cycleIndexes.next().value;
    return this.storages[index];
  }

  async addNameSpace(name) {
    const storage_name = this.allocateStorage();
    const namespace = { storage_name, name };
    await this.client.namespaceService
      .addNamespace(namespace, this.auth_meta, {});
    return namespace;
  }

  async createRepository(storage_name, namespace, repo_name) {
    const repository = formatRepo(storage_name, namespace, repo_name);
    await this.client.repositoryService
      .createRepository({ repository }, this.auth_meta, {});
    return repository;
  }

  async deleteRepository(storage_name, namespace, repo_name) {
    const repository = formatRepo(storage_name, namespace, repo_name);
    await this.client.repositoryService
      .cleanup({ repository }, this.auth_meta, {});
    return true;
  }
}

module.exports = GitalyService;
