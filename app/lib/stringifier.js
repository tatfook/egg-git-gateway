'use strict';

const fast_JSON = require('fast-json-stringify');

const stringify_commit = fast_JSON({
  title: 'stringify commit message',
  type: 'object',
  properties: {
    project_id: { type: 'string' },
    createdAt: { type: 'string' },
    visibility: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          action: { type: 'string' },
          file_path: { type: 'string' },
          previous_path: { type: 'string' },
          content: { type: 'string' },
        },
      },
    },
  },
});

const stringifyCommitRecord = fast_JSON({
  title: 'stringify commit record',
  type: 'object',
  properties: {
    short_id: { type: 'string' },
    author_name: { type: 'string' },
    authored_date: { type: 'string' },
    created_at: { type: 'string' },
    message: { type: 'string' },
    version: { type: 'number' },
  },
});

const stringify_project = fast_JSON({
  title: 'stringify project',
  type: 'object',
  properties: {
    _id: { type: 'string' },
    visibility: { type: 'string' },
    path: { type: 'string' },
    method: { type: 'string' },
  },
});

const stringify_file = fast_JSON({
  title: 'stringify file',
  type: 'object',
  properties: {
    _id: { type: 'string' },
    path: { type: 'string' },
    type: { type: 'string' },
    content: { type: 'string' },
    latest_commit: { type: 'object', properties: {
      _id: { type: 'string' },
      commit_id: { type: 'string' },
      short_id: { type: 'string' },
      version: { type: 'number' },
      author_name: { type: 'string' },
      source_version: { type: 'number' },
      message: { type: 'string' },
      createdAt: { type: 'string' },
    } },
  },
});

const stringify_tree = fast_JSON({
  title: 'stringify tree',
  type: 'array',
  items: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      name: { type: 'string' },
      type: { type: 'string' },
      path: { type: 'string' },
    },
  },
});

module.exports = {
  stringify_commit,
  stringifyCommitRecord,
  stringify_project,
  stringify_file,
  stringify_tree,
};
