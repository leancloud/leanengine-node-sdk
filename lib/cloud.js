var AV = require('./storage-extra');
var debug = require('debug')('AV:LeanEngine');
var utils = require('./utils');

var Cloud = module.exports = {
  __code: {}
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

  Cloud.__code[name] = func;
};

var originalCloudRun = AV.Cloud.run;

Cloud.run = function(name, data, options) {
  options = options || {};

  if (options.remote) {
    if (options.user) {
      options.sessionToken = options.sessionToken || options.getSessionToken();
    }
    return originalCloudRun.apply(null, arguments);
  }

  return AV.Promise.as().then(function() {
    if (options.sessionToken) {
      return AV.User.become(options.sessionToken);
    }
  }).then(function(user) {
    user = user || options.user;

    return new Promise(function(resolve, reject) {
      var request = utils.prepareRequestObject({
        user: user,
        params: data,
        req: options.req
      });

      var response = utils.prepareResponseObject(options.req && options.req.res, function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });

      Cloud.__code[name](request, response);
    });
  }).catch(function(err) {
    console.log('Run function \'' + name + '\' failed with error:', err);
    throw err;
  })._thenRunCallbacks(options);
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

if (!AV.Insight) {
  AV.Insight = {};
}

AV.Insight.on = function(action, func) {
  Cloud.define('__on_complete_bigquery_job', func);
};

Cloud.logInByIdAndSessionToken = function(uid, sessionToken, fetchUser, cb) {
  if (fetchUser) {
    AV.User.become(sessionToken, {
      success: function(user) {
        return cb(null, user);
      },
      error: function(user, err) {
        return cb(err);
      }
    });
  } else {
    var user = new AV.User();
    user.id = uid;
    user._sessionToken = sessionToken;
    return cb(null, user);
  }
};

// 增加 Cloud.httpRequest 的支持
Cloud.httpRequest = require('./http-request');

function defineClassHook(className, hook, func) {
  debug('define class hook: %s %s', hook, className);
  Cloud.__code[hook + className] = func;
}

function className(clazz) {
  if (utils.typeOf(clazz) === 'string') {
    return clazz;
  } else if (clazz.className) {
    return clazz.className;
  } else {
    throw new Error('Unknown class:' + clazz);
  }
}
