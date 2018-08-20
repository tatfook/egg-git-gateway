define({ "api": [
  {
    "type": "post",
    "url": "/accounts",
    "title": "create",
    "name": "CreateAccount",
    "group": "Account",
    "description": "<p>To create a git account for a new keepwork user</p>",
    "permission": [
      {
        "name": "admin"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "size": ">8",
            "optional": false,
            "field": "password",
            "description": "<p>Password of the gitlab account</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "app/controller/account.js",
    "groupTitle": "Account"
  },
  {
    "type": "delete",
    "url": "/accounts/:username",
    "title": "remove",
    "name": "RemoveAccount",
    "group": "Account",
    "description": "<p>To removed an account</p>",
    "permission": [
      {
        "name": "admin"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username of the user</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "app/controller/account.js",
    "groupTitle": "Account"
  },
  {
    "type": "post",
    "url": "/projects/user/:username",
    "title": "create",
    "name": "CreateProject",
    "group": "Project",
    "description": "<p>To create a git project for a new keepwork website</p>",
    "permission": [
      {
        "name": "admin"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username of the website owner</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "sitename",
            "description": "<p>Name of the website</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "site_id",
            "description": "<p>Id of the website in keepwork</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "size": "public, private",
            "optional": false,
            "field": "visibility",
            "description": "<p>Visibility of the website</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "app/controller/project.js",
    "groupTitle": "Project"
  },
  {
    "type": "delete",
    "url": "/projects/:encoded_path",
    "title": "remove",
    "name": "RemoveProject",
    "group": "Project",
    "description": "<p>To remove a project</p>",
    "permission": [
      {
        "name": "admin"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "encoded_path",
            "description": "<p>Urlencoded path of a project.Like 'username%2Fproject_name'</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "app/controller/project.js",
    "groupTitle": "Project"
  },
  {
    "type": "put",
    "url": "/projects/:encoded_path/visibility",
    "title": "update visibility",
    "name": "UpdateVisibility",
    "group": "Project",
    "description": "<p>To update the visibility of a project</p>",
    "permission": [
      {
        "name": "admin"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "encoded_path",
            "description": "<p>Urlencoded path of a project.Like 'username%2Fproject_name'</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "size": "public, private",
            "optional": false,
            "field": "visibility",
            "description": "<p>Visibility of the website</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "app/controller/project.js",
    "groupTitle": "Project"
  }
] });
