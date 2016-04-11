var AV = require('./av-extra');
var debug = require('debug')('AV:LeanEngine');
var utils = require('./utils');

var Cloud = module.exports = {
  __code: {}
};

Cloud.define = function(name, func) {
  debug('define function: %s', name);
  Cloud.__code[name] = func;
};

Cloud.run = function(name, data, options) {
  var promise = new AV.Promise();
  try {
    // TODO: support sessionToken (call AV.User.become)
    var user = options && options.user;

    Cloud.__code[name]({params: data, user: user}, {
      success: function(result) {
        promise.resolve(result);
      },
      error: function(err) {
        promise.reject(err);
      }
    });
  } catch (err) {
    console.log('Run function \'' + name + '\' failed with error:', err);
    promise.reject(err);
  }
  return promise._thenRunCallbacks(options);
};

//TODO: override Cloud.rpc

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
AV.Cloud.httpRequest = require('./http-request');

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
