'use strict';

var connect = require('connect');
var bodyParser = require('body-parser');
var https = require('https');
var timeout = require('connect-timeout');
var _ = require('underscore');

var AV = require('./storage-extra');
var utils = require('./utils');

var NODE_ENV = process.env.NODE_ENV || 'development';

AV.express = function(options) {
  var router = connect();

  router.use(require('../middleware/health-check')());

  ['1', '1.1'].forEach(function(apiVersion) {
    router.use('/' + apiVersion + '/call', function(req, res, next) {
      req.rpcCall = true;
      next();
    });

    ['functions', 'call'].forEach(function(urlEndpoint) {
      router.use('/' + apiVersion + '/' + urlEndpoint, createCloudFunctionRouter(options));
    });
  });

  return router;
};

AV.koa = function(options) {
  return require('../middleware/koa')(AV);
};

var Cloud = _.extend(AV.Cloud, require('./cloud'));

// Don't reject unauthorized ssl.
if (https.globalAgent && https.globalAgent.options) {
  https.globalAgent.options.rejectUnauthorized = false;
}

AV.Cloud.CookieSession = function(options) {
  if (options && options.framework == 'koa') {
    return require('../middleware/cookie-session-koa')(AV)(options);
  } else {
    return require('../middleware/cookie-session')(AV)(options);
  }
};

AV.Cloud.HttpsRedirect = function(options) {
  if (options && options.framework == 'koa') {
    return require('../middleware/https-redirect-koa')(AV)(options);
  } else {
    return require('../middleware/https-redirect')(AV)(options);
  }
}

AV.Cloud.LeanCloudHeaders = function(options) {
  if (options && options.framework == 'koa') {
    return require('../middleware/leancloud-heaedrs-koa')(AV)(options);
  } else {
    return require('../middleware/leancloud-heaedrs')(AV)(options);
  }
}

function createCloudFunctionRouter(options) {
  options = options || {};

  var cloudFunctions = connect();

  cloudFunctions.use(timeout(options.timeout || '15s'));
  cloudFunctions.use(bodyParser.urlencoded({extended: false, limit: '20mb'}));
  cloudFunctions.use(bodyParser.json({limit: '20mb'}));
  cloudFunctions.use(bodyParser.text({limit: '20mb'}));
  cloudFunctions.use(require('../middleware/cors')());
  cloudFunctions.use(require('../middleware/leancloud-headers')(AV)({restrict: true}));

  cloudFunctions.use('/_ops/metadatas', function(req, res) {
    if (req.AV.authMasterKey) {
      return resp(res, Object.keys(Cloud.functions));
    } else {
      return utils.unauthResp(res);
    }
  });

  var fetchUserMiddleware = require('../middleware/fetch-user')(AV);

  cloudFunctions.use(function(req, res, next) {
    if (req.url === '/') {
      return respError(res, 'no function or class name');
    }

    var fetchUser = function(callback) {
      fetchUserMiddleware(req, res, function(err) {
        if (err) {
          next(err);
        } else {
          callback();
        }
      });
    };

    var sendResponse = function(err, data, isBare) {
      if (err) {
        return respError(res, err);
      }
      if (isBare) {
        return respBare(res, data);
      } else {
        return resp(res, data);
      }
    };

    var splited = req.url.split('/');
    if (splited.length == 2) { // cloud function
      if (_.contains([
        '_messageReceived', '_receiversOffline', '_messageSent', '_conversationStart', '_conversationStarted',
        '_conversationAdd', '_conversationRemove', '_conversationUpdate'
      ], splited[1])) {
        if (!utils.verifyHookSign(AV.masterKey, splited[1], req.body.__sign)) {
          console.error('LeanEngine: verifyHookSign failed on', (req.originalUrl || req.url), 'from', utils.getRemoteAddress(req));
          return utils.unauthResp(res);
        }
      }

      var handleCloudfunction = function() {
        call(splited[1], req.body, req.AV.user, req, {
          decodeAVObject: req.rpcCall
        }, function(err, data) {
          sendResponse(err, data);
        });
      };

      if (Cloud.functions[splited[1]] && Cloud.functions[splited[1]].fetchUser === false) {
        handleCloudfunction();
      } else {
        fetchUser(handleCloudfunction);
      }
    } else if (splited.length == 3) { // class hook
      var userObj = new AV.User();
      if (splited[1] === 'onVerified') {
        if (utils.verifyHookSign(AV.masterKey, '__on_verified_' + splited[2], req.body.object.__sign)) {
          userObj._finishFetch(req.body.object, true);
          onVerified(req, splited[2], userObj);
          sendResponse(null, 'ok');
        } else {
          console.error('LeanEngine: verifyHookSign failed on', (req.originalUrl || req.url), 'from', utils.getRemoteAddress(req));
          return utils.unauthResp(res);
        }
      } else if (splited[1] === '_User' && splited[2] === 'onLogin') {
        if (utils.verifyHookSign(AV.masterKey, '__on_login__User', req.body.object.__sign)) {
          userObj._finishFetch(req.body.object, true);
          onLogin(req, userObj, sendResponse);
        } else {
          console.error('LeanEngine: verifyHookSign failed on', (req.originalUrl || req.url), 'from', utils.getRemoteAddress(req));
          return utils.unauthResp(res);
        }
      } else if ((splited[1] === 'BigQuery' || splited[1] === 'Insight' ) && splited[2] === 'onComplete') {
        if (utils.verifyHookSign(AV.masterKey, '__on_complete_bigquery_job', req.body.__sign)) {
          onCompleteBigQueryJob(req.body);
          sendResponse(null, 'ok');
        } else {
          console.error('LeanEngine: verifyHookSign failed on', (req.originalUrl || req.url), 'from', utils.getRemoteAddress(req));
          return utils.unauthResp(res);
        }
      } else {
        var verified = false;

        if (splited[2].indexOf('after') === 0) {
          verified = utils.verifyHookSign(AV.masterKey, '__after_for_' + splited[1], req.body.object.__after);
        } else {
          verified = utils.verifyHookSign(AV.masterKey, '__before_for_' + splited[1], req.body.object.__before);
        }

        if (!verified) {
          console.error('LeanEngine: verifyHookSign failed on', (req.originalUrl || req.url), 'from', utils.getRemoteAddress(req));
          return utils.unauthResp(res);
        }

        if (req.body.user) {
          userObj._finishFetch(req.body.user, true);
          req.AV.user = userObj;
        }

        classHook(splited[1], hookNameMapping[splited[2]], req.body.object, userObj, req, sendResponse);
      }
    }
  });

  cloudFunctions.use(function(err, req, res, next) { // jshint ignore:line
    if(req.timedout) {
      console.error('LeanEngine function timeout, url=%s, timeout=%d', req.originalUrl, err.timeout);
      err.code = 124; // https://leancloud.cn/docs/error_code.html#_124
      err.message = 'The request timed out on the server.';
    }
    respError(res, err);
  });

  return cloudFunctions;
}

var resp = function(res, data) {
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.statusCode = 200;
  return res.end(JSON.stringify({result: data}));
};

var respBare = function(res, data) {
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.statusCode = 200;
  return res.end(JSON.stringify(data));
};

var respError = function(res, err) {
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.statusCode = err.status || err.statusCode || 400;
  res.end(JSON.stringify({
    code: err.code || 1,
    error: err && (err.message || err.responseText || err) || 'null message'
  }));
};

var call = function(funcName, params, user, req, options, cb) {
  if (!options) {
    options = {};
  }

  const cloudFunction = Cloud.functions[funcName]

  if (!cloudFunction) {
    var err = new Error("LeanEngine not found function named '" + funcName +  "' for app '" + AV.applicationId + "' on " + NODE_ENV + ".");
    err.statusCode = 404;
    return cb(err);
  }

  if (options.decodeAVObject) {
    params = decodeParams(params);
  }

  const request = utils.prepareRequestObject({
    user: user,
    params: params,
    req: req
  });

  if (cloudFunction.length == 2) {
    const response = utils.prepareResponseObject(req.res, function(err, result) {
      if (!err && options.decodeAVObject) {
        result = encodeResult(result);
      }
      cb(err, result);
    });

    try {
      cloudFunction(request, response);
    } catch (err) {
      console.warn('Execute \'' + funcName + '\' failed with error: ' + (err.stack || err));
      err.statusCode = 500;
      return cb(err);
    }
  } else {
    promiseTry(cloudFunction.bind(null, request)).then( result => {
      if (options.decodeAVObject) {
        cb(null, encodeResult(result))
      } else {
        cb(null, result)
      }
    }).catch( (err) => {
      if (!err.status) {
        err.status = 500;
      }

      if (err.status == 500) {
        console.warn('Execute \'' + funcName + '\' failed with error: ' + (err.stack || err));
      }

      cb(err);
    });
  }
};

var classHook = function(className, hook, object, user, req, cb) {
  if (!Cloud.functions[hook + className]) {
    var err = new Error("LeanEngine could not find hook '" + hook + className +  "' for app '" + AV.applicationId + "' on " + NODE_ENV + ".");
    err.statusCode = 404;
    return cb(err);
  }

  var obj = decodeParams(_.extend({}, object, {
    __type: 'Object',
    className: className
  }));

  // for beforeUpdate
  if (object._updatedKeys) {
    obj.updatedKeys = object._updatedKeys;
  }

  try {
    var request = utils.prepareRequestObject({
      user: user,
      object: obj,
      req: req
    });

    if (hook.indexOf('__after_') === 0) {
      setHookMark('__after', obj);
      // after 的 hook 不需要 response 参数，并且请求默认返回 ok
      Cloud.functions[hook + className](request);
      return cb(null, 'ok');
    } else {
      setHookMark('__before', obj);
      Cloud.functions[hook + className](request, utils.prepareResponseObject(req.res, function(err) {
        if (err) {
          cb(new Error(err));
        } else if ('__before_delete_for_' === hook) {
          cb(null, {}, true);
        } else {
          cb(null, obj, true);
        }
      }));
    }
  } catch (err) {
    console.warn('Execute \'' + hook + className + '\' failed with error: ' + (err.stack || err));
    if (hook.indexOf('__after__') === 0) {
      return cb(null, 'ok');
    }
    err.statusCode = 500;
    return cb(err);
  }
};

var setHookMark = function(hookAction, obj) {
  var sign = obj.get(hookAction);
  if(sign) {
    obj.set(hookAction, sign);
  } else {
    if(hookAction.indexOf('__before') === 0) {
      obj.disableBeforeHook();
    } else if(hookAction.indexOf('__after') === 0) {
      obj.disableAfterHook();
    }
  }
};

var onVerified = function(req, type, user) {
  try {
    var request = utils.prepareRequestObject({
      user: user,
      object: user,
      req: req
    });

    Cloud.functions['__on_verified_' + type](request);
  } catch (err) {
    console.warn('Execute onVerified ' + type + ' failed with error: ' + (err.stack || err));
  }
};

var onLogin = function(req, user, cb) {
  try {
    var request = utils.prepareRequestObject({
      user: user,
      object: user,
      req: req
    });

    var response = utils.prepareResponseObject(req.res, function(err) {
      if (err) {
        cb(new Error(err));
      } else {
        cb(null, 'ok');
      }
    });

    Cloud.functions['__on_login__User'](request, response);
  } catch (err) {
    console.warn('Execute onLogin failed with error: ' + (err.stack || err));
  }
};

var onCompleteBigQueryJob = function(data) {
  try {
    Cloud.functions['__on_complete_bigquery_job'](null, data);
  } catch (err) {
    console.warn('Execute onCompleteBigQueryJob failed with error: ' + (err.stack || err));
  }
};

var hookNameMapping = {
  beforeSave: '__before_save_for_',
  beforeUpdate: '__before_update_for_',
  afterSave: '__after_save_for_',
  afterUpdate: '__after_update_for_',
  beforeDelete: '__before_delete_for_',
  afterDelete: '__after_delete_for_'
};

var encodeResult = function(result) {
  var encodeAVObject = function(object) {
    if (object && object._toFullJSON){
      object = object._toFullJSON([]);
    }

    return _.mapObject(object, function(value) {
      return AV._encode(value, []);
    });
  };

  if (_.isArray(result)) {
    return result.map(function(object) {
      return encodeAVObject(object);
    });
  } else {
    return encodeAVObject(result);
  }
};

var decodeParams = AV._decode;

function promiseTry(func) {
  return new Promise((resolve, reject) => {
    try {
      Promise.resolve(func()).then(resolve, reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = AV;
