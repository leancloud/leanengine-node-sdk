'use strict';

var Cookies = require('cookies');
var onHeaders = require('on-headers');
var debug = require('debug')('AV:cookieSession');

module.exports = function(AV) {
  return function(opts) {
    opts = opts || {};

    // name - previously "opts.key"
    var name = opts.name || opts.key || 'avos:sess';

    // secrets
    var keys = opts.keys;
    if (!keys && opts.secret) {
      keys = [opts.secret];
    }

    // defaults
    if (!opts.overwrite) {
      opts.overwrite = true;
    }
    opts.httpOnly = true;
    opts.signed = true;

    if (!keys && opts.signed) {
      throw new Error('.keys required for avos cookie sessions.');
    }

    debug('session options %j', opts);

    return function cookieSession(req, res, next) {
      var cookies = new Cookies(req, res, {keys: keys});
      var responseUser;

      // 兼容 connect
      if (!res.req) res.req = req;
      if (!req.res) req.res = res;

      // to pass to Session()
      req.sessionOptions = opts;
      req.sessionKey = name;

      res.saveCurrentUser = function(user) {
        if (!user || !user.getSessionToken()) {
          console.trace('LeanEngine: saveCurrentUser: User 对象上没有 sessionToken, 无法正确保存用户状态');
        }

        responseUser = user;
      };

      res.clearCurrentUser = function() {
        responseUser = null;
      };

      onHeaders(res, function setHeaders() {
        var session = null;

        if (responseUser) {
          session = {
            _uid: responseUser.id,
            _sessionToken: responseUser._sessionToken
          };

          debug('session %j', session);
          cookies.set(name, encode(session), opts);
        } else if (responseUser === null) {
          debug('clear session');
          cookies.set(name, '', opts);
        }
      });

      var session = {};
      var json = cookies.get(name, opts);
      if (json) {
        session = decode(json);
      }
      var uid = session._uid;
      var sessionToken = session._sessionToken;
      req.AV = req.AV || {};
      if (uid && sessionToken) {
        AV.Cloud.logInByIdAndSessionToken(uid, sessionToken, opts.fetchUser, function(err, user) {
          if(err) {
            debug('sessionToken invalid, uid: %s', uid);
          } else {
            req.AV.user = user;
            req.currentUser = user;
            req.sessionToken = user.getSessionToken();
          }
          return next();
        });
      } else {
        return next();
      }
    };
  };
};

/**
 * Decode the base64 cookie value to an object.
 *
 * @param {String} string
 * @return {Object}
 * @private
 */

function decode(string) {
  var body = new Buffer(string, 'base64').toString('utf8');
  return JSON.parse(body);
}

/**
 * Encode an object into a base64-encoded JSON string.
 *
 * @param {Object} body
 * @return {String}
 * @private
 */

function encode(body) {
  body = JSON.stringify(body);
  return new Buffer(body).toString('base64');
}
