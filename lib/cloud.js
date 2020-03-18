'use strict';

var AV = require('./storage-extra');
var debug = require('debug')('AV:LeanEngine');
var utils = require('./utils');
var _ = require('underscore');

var Cloud = module.exports = {
  functions: {}
};

Cloud.define = function(name, options, func) {
  debug('define function: %s', name);

  if (!func) {
    func = options;
    options = {};
  }

  if (options && options.fetchUser === false) {
    func.fetchUser = false;
  }

  if (options && options.internal) {
    func.internal = true;
  }

  if (Cloud.functions[name]) {
    throw new Error(`LeanEngine: ${name} already defined`);
  } else {
    Cloud.functions[name] = func;
  }
};

var originalCloudRun = AV.Cloud.run;

Cloud.run = function(funcName, data, options) {
  options = options || {};

  if (options.remote) {
    if (options.user) {
      options.sessionToken = options.sessionToken || options.user.getSessionToken();
    }
    return originalCloudRun.apply(null, arguments);
  }

  return Promise.resolve().then(function() {
    if (options.sessionToken) {
      return AV.User.become(options.sessionToken);
    }
  }).then(function(user) {
    user = user || options.user;

    const cloudFunction = Cloud.functions[funcName];

    if (!cloudFunction) {
      throw new Cloud.Error(`No such cloud function '${funcName}'`, {status: 404, printToLog: true, printFullStack: false});
    }

    const request = utils.prepareRequestObject({
      user: user,
      params: data,
      req: options.req
    });

    if (cloudFunction.length === 2) {
      return new Promise( (resolve, reject) => {
        const response = utils.prepareResponseObject(options.req && options.req.res, function(err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });

        cloudFunction(request, response);
      });
    } else {
      return cloudFunction(request);
    }
  });
};

var originalCloudRpc = AV.Cloud.rpc;

Cloud.rpc = function(name, data, options) {
  if (options && options.remote) {
    if (options.user) {
      options.sessionToken = options.sessionToken || options.getSessionToken();
    }
    return originalCloudRpc.apply(null, arguments);
  } else {
    return Cloud.run.apply(null, arguments);
  }
};

Cloud.enqueue = function(name, params, options) {
  options = options || {};

  if (!options.prod && !AV.Cloud.__prod) {
    options.prod = 0;
  }

  return AV.request({
    method: 'POST',
    path: '/engine/cloud-queue/tasks',
    data: _.extend({
      function: name,
      params: params || {}
    }, options),
    authOptions: {useMasterKey: true}
  });
};

Cloud.getTaskInfo = function(uniqueId) {
  return AV.request({
    method: 'GET',
    path: `/engine/cloud-queue/tasks/${uniqueId}`
  }).then( body => {
    if (body.finishedAt) {
      body.finishedAt = new Date(body.finishedAt);
    }

    if (body.retryAt) {
      body.retryAt = new Date(body.retryAt);
    }

    return body;
  });
};

Cloud.beforeSave = function(nameOrClass, func) {
  defineClassHook(className(nameOrClass), '__before_save_for_', func);
};

Cloud.afterSave = function(nameOrClass, func) {
  defineClassHook(className(nameOrClass), '__after_save_for_', func);
};

Cloud.beforeUpdate = function(nameOrClass, func) {
  defineClassHook(className(nameOrClass), '__before_update_for_', func);
};

Cloud.afterUpdate = function(nameOrClass, func) {
  defineClassHook(className(nameOrClass), '__after_update_for_', func);
};

Cloud.beforeDelete = function(nameOrClass, func) {
  defineClassHook(className(nameOrClass), '__before_delete_for_', func);
};

Cloud.afterDelete = function(nameOrClass, func) {
  defineClassHook(className(nameOrClass), '__after_delete_for_', func);
};

Cloud.onVerified = function(type, func) {
  Cloud.define('__on_verified_' + type, func);
};

Cloud.onLogin = function(func) {
  Cloud.define('__on_login__User', func);
};

_.each(utils.realtimeHookMapping, (metadataName, hookName) => {
  Cloud[hookName] = Cloud.define.bind(null, metadataName);
});

if (!AV.Insight) {
  AV.Insight = {};
}

AV.Insight.on = function(action, func) {
  Cloud.define('__on_complete_bigquery_job', func);
};

Cloud.Error = class CloudError extends Error {
  constructor(message, extra) {
    super();

    extra = extra || {};

    if (!extra.status) {
      extra.status = 400;
    }

    _.extend(this, {
      name: 'CloudError',
      message: message
    }, extra);

    Error.captureStackTrace(this, this.constructor);
  }
};

Cloud.logInByIdAndSessionToken = function(uid, sessionToken, fetchUser, cb) {
  if (fetchUser) {
    AV.User.become(sessionToken).then(
      function(user) {
        return cb(null, user);
      },
      function(err) {
        return cb(err);
      }
    );
  } else {
    var user = new AV.User();
    user.id = uid;
    user._sessionToken = sessionToken;
    return cb(null, user);
  }
};

function defineClassHook(className, hook, func) {
  debug('define class hook: %s %s', hook, className);

  if (Cloud.functions[hook + className]) {
    throw new Error(`LeanEngine: ${hook} of ${className} already defined`);
  } else {
    Cloud.functions[hook + className] = func;
  }
}

function className(clazz) {
  if (_.isString(clazz)) {
    return clazz;
  } else if (clazz.className) {
    return clazz.className;
  } else {
    throw new Error('Unknown class:' + clazz);
  }
}

const PORT = parseInt(process.env.LEANCLOUD_APP_PORT || 3000);
let server;

Cloud.start = function() {
  if (!AV.applicationId) {
    AV.init({
      appId: process.env.LEANCLOUD_APP_ID,
      appKey: process.env.LEANCLOUD_APP_KEY,
      masterKey: process.env.LEANCLOUD_APP_MASTER_KEY,
      hookKey: process.env.LEANCLOUD_APP_HOOK_KEY,
    });
  }
  const app = AV.express();
  app.use('/', function(req, res) {
    res.end('This is a LeanEngine application.');
  });
  server = app.listen(PORT, function() {
    console.log('LeanEngine Cloud Functions app is running, port:', PORT);
  });
};

Cloud.stop = function() {
  if (server) {
    server.close();
  }
};
