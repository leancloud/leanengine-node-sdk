'use strict';
var connect = require('connect'),
  bodyParser = require('body-parser'),
  https = require('https'),
  timeout = require('connect-timeout'),
  AV = require('./av-extra'),
  avosExpressCookieSession = require('../middleware/cookie-session'),
  avosExpressHttpsRedirect = require('../middleware/https-redirect'),
  utils = require('./utils');

var _ = AV._;

if (process.env.LEANCLOUD_REGION) {
  AV._config.region = process.env.LEANCLOUD_REGION;
}

if (process.env.LC_API_SERVER) {
  AV._config.APIServerURL = process.env.LC_API_SERVER;
}

var NODE_ENV = process.env.NODE_ENV || 'development';
AV.Cloud.__prod = NODE_ENV === 'production' ? 1 : 0;

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

// override AV.Cloud to a connect app
if (!AV._old_Cloud) {
  AV._old_Cloud = AV.Cloud;
  var defaultMiddleware;

  AV.Cloud = function() {
    if (!defaultMiddleware) {
      console.error('Use AV.Cloud as a middleware is deprecated, use AV.express() instead');
      defaultMiddleware = AV.express();
    }

    defaultMiddleware.apply(this, arguments);
  };

  for (var key in AV._old_Cloud) {
    AV.Cloud[key] = AV._old_Cloud[key];
  }
}

var Cloud = _.extend(AV.Cloud, require('./cloud'));

// Don't reject unauthorized ssl.
if (https.globalAgent && https.globalAgent.options) {
  https.globalAgent.options.rejectUnauthorized = false;
}

AV.Cloud.CookieSession = avosExpressCookieSession(AV);
AV.Cloud.HttpsRedirect = avosExpressHttpsRedirect(AV);

function createCloudFunctionRouter(options) {
  options = options || {};

  var cloudFunctions = connect();

  cloudFunctions.use(timeout(options.timeout || '15s'));
  cloudFunctions.use(bodyParser.urlencoded({extended: false, limit: '20mb'}));
  cloudFunctions.use(bodyParser.json({limit: '20mb'}));
  cloudFunctions.use(bodyParser.text({limit: '20mb'}));
  cloudFunctions.use(require('../middleware/cors')());
  cloudFunctions.use(require('../middleware/domain-wrapper')());
  cloudFunctions.use(require('../middleware/parse-leancloud-headers')(AV, {restrict: true}));

  cloudFunctions.use('/_ops/metadatas', function(req, res) {
    if (req.AV.authMasterKey) {
      return resp(res, Object.keys(Cloud.__code));
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
      var handleCloudfunction = function() {
        call(splited[1], req.body, req.AV.user, req, {
          decodeAVObject: req.rpcCall
        }, function(err, data) {
          sendResponse(err, data);
        });
      };

      if (Cloud.__code[splited[1]] && Cloud.__code[splited[1]].fetchUser === false) {
        handleCloudfunction();
      } else {
        fetchUser(handleCloudfunction);
      }
    } else if (splited.length == 3) { // class hook
      var userObj = new AV.User();
      if (splited[1] === 'onVerified') {
        userObj._finishFetch(req.body.object, true);
        onVerified(req, splited[2], userObj);
        sendResponse(null, 'ok');

      } else if (splited[1] === '_User' && splited[2] === 'onLogin') {
        userObj._finishFetch(req.body.object, true);
        onLogin(req, userObj, sendResponse);

      } else if ((splited[1] === 'BigQuery' || splited[1] === 'Insight' ) && splited[2] === 'onComplete') {
        onCompleteBigQueryJob(req.body);
        sendResponse(null, 'ok');

      } else {
        fetchUser(function() {
          classHook(splited[1], hookNameMapping[splited[2]], req.body.object, req.AV.user, req, sendResponse);
        });
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
  res.statusCode = err.statusCode || 400;
  res.end(JSON.stringify({
    code: err.code || 1,
    error: err && (err.message || err.responseText || err) || 'null message'
  }));
};

var call = function(funcName, params, user, req, options, cb) {
  if (!options) {
    options = {};
  }

  if (!Cloud.__code[funcName]) {
    var err = new Error("LeanEngine not found function named '" + funcName +  "' for app '" + AV.applicationId + "' on " + NODE_ENV + ".");
    err.statusCode = 404;
    return cb(err);
  }
  try {
    if (options.decodeAVObject) {
      params = decodeParams(params);
    }

    var request = prepareRequestObject({
      user: user,
      params: params,
      req: req
    });

    var response = prepareResponseObject(req.res, function(err, result) {
      if (!err && options.decodeAVObject) {
        result = encodeResult(result);
      }
      cb(err, result);
    });

    Cloud.__code[funcName](request, response);
  } catch (err) {
    console.warn('Execute \'' + funcName + '\' failed with error: ' + (err.stack || err));
    err.statusCode = 500;
    return cb(err);
  }
};

var classHook = function(className, hook, object, user, req, cb) {
  if (!Cloud.__code[hook + className]) {
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
    var request = prepareRequestObject({
      user: user,
      object: obj,
      req: req
    });

    if (hook.indexOf('__after_') === 0) {
      setHookMark('__after', obj);
      // after 的 hook 不需要 response 参数，并且请求默认返回 ok
      Cloud.__code[hook + className](request);
      return cb(null, 'ok');
    } else {
      setHookMark('__before', obj);
      Cloud.__code[hook + className](request, prepareResponseObject(req.res, function(err) {
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
    var request = prepareRequestObject({
      user: user,
      object: user,
      req: req
    });

    Cloud.__code['__on_verified_' + type](request);
  } catch (err) {
    console.warn('Execute onVerified ' + type + ' failed with error: ' + (err.stack || err));
  }
};

var onLogin = function(req, user, cb) {
  try {
    var request = prepareRequestObject({
      user: user,
      object: user,
      req: req
    });

    var response = prepareResponseObject(req.res, function(err) {
      if (err) {
        cb(new Error(err));
      } else {
        cb(null, 'ok');
      }
    });

    Cloud.__code.__on_login__User(request, response);
  } catch (err) {
    console.warn('Execute onLogin failed with error: ' + (err.stack || err));
  }
};

var onCompleteBigQueryJob = function(data) {
  try {
    Cloud.__code.__on_complete_bigquery_job(null, data);
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

/* options: req, user, params, object*/
var prepareRequestObject = function(options) {
  var req = options.req;
  var user = options.user;

  var currentUser = user || (req.AV && req.AV.user);

  return {
    expressReq: req,
    params: options.params,
    object: options.object,
    user: user,
    meta: {
      remoteAddress: req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    },

    /* User from client */
    currentUser: currentUser,

    sessionToken: (currentUser && currentUser.getSessionToken()) || req.sessionToken
  };
};

var prepareResponseObject = function(res, callback) {
  return {
    success: function(result) {
      callback(null, result);
    },

    error: function(error) {
      callback(error);
    }
  };
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

var decodeParams = function(params) {
  return AV._decode('', params);
};

module.exports = AV;
