'use strict';
var crypto = require('crypto');

exports.typeOf = function(obj) {
  var classToType;
  if (obj === void 0 || obj === null) {
    return String(obj);
  }
  classToType = {
    '[object Boolean]': 'boolean',
    '[object Number]': 'number',
    '[object String]': 'string',
    '[object Function]': 'function',
    '[object Array]': 'array',
    '[object Date]': 'date',
    '[object RegExp]': 'regexp',
    '[object Object]': 'object'
  };
  return classToType[Object.prototype.toString.call(obj)];
};

exports.unauthResp = function(res) {
  res.statusCode = 401;
  res.setHeader('content-type', 'application/json; charset=UTF-8');
  return res.end(JSON.stringify({ code: 401, error: 'Unauthorized.' }));
};

exports.signHook = function(masterKey, hookName, ts) {
  return ts + ',' + crypto.createHmac('sha1', masterKey).update(hookName + ':' + ts).digest('hex');
};

exports.verifyHookSign = function(masterKey, hookName, sign) {
  if (sign) {
    return exports.signHook(masterKey, hookName, sign.split(',')[0]) === sign;
  } else {
    return false;
  }
};

/* options: req, user, params, object*/
exports.prepareRequestObject = function(options) {
  var req = options.req;
  var user = options.user;

  var currentUser = user || (req && req.AV && req.AV.user);

  return {
    expressReq: req,

    params: options.params,
    object: options.object,
    meta: {
      remoteAddress: req && req.headers && getRemoveAddress(req)
    },

    user: user,
    currentUser: currentUser,
    sessionToken: (currentUser && currentUser.getSessionToken()) || (req && req.sessionToken)
  };
};

exports.prepareResponseObject = function(res, callback) {
  return {
    success: function(result) {
      callback(null, result);
    },

    error: function(error) {
      callback(error);
    }
  };
};

var getRemoveAddress = exports.getRemoveAddress = function(req) {
  return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
};

exports.endsWith = function(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
};
