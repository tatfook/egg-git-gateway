'use strict';

const fast_JSON = require('fast-json-stringify');

const commit_stringifier = fast_JSON({
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

const project_stringifier = fast_JSON({
  title: 'stringify project',
  type: 'object',
  properties: {
    _id: { type: 'string' },
    visibility: { type: 'string' },
    path: { type: 'string' },
    method: { type: 'string' },
  },
});

const node_stringifier = fast_JSON({
  title: 'stringify file',
  type: 'object',
  properties: {
    _id: { type: 'string' },
    path: { type: 'string' },
    type: { type: 'string' },
    content: { type: 'string' },
  },
});

const tree_stringifier = fast_JSON({
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
  commit_stringifier,
  project_stringifier,
  node_stringifier,
  tree_stringifier,
};
