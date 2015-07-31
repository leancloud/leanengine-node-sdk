/**
 * update from cookie-sesion middleware
 */
(function() {
  'use strict';
  var domain = require('domain');
  var Cookies = require('cookies');
  var onHeaders = require('on-headers');
  var debug = require('debug')('AV:cookieSession');

  module.exports = function(av) {
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
        var cookieSetter = function() {
          var cookies = req.sessionCookies = new Cookies(req, res, keys);

          // to pass to Session()
          req.sessionOptions = opts;
          req.sessionKey = name;

          onHeaders(res, function setHeaders() {
            var session = null;
            var user = av.User.current();
            if (user) {
              session = {
                _uid: user.id,
                _sessionToken: user._sessionToken
              };
            }
            if (!session) {
              debug('clear session');
              cookies.set(name, '', opts);
            } else {
              debug('session %j', session);
              cookies.set(name, encode(session), opts);
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
            av.Cloud.logInByIdAndSessionToken(uid, sessionToken, opts.fetchUser, function(err, user) {
              if(err) {
                debug('sessionToken invalid, uid: %s', uid);
                av.User.logOut();
                delete req.AV.user;
              } else {
                req.AV.user = user;
              }
              return next();
            });
          } else {
            av.User.logOut();
            delete req.AV.user;
            return next();
          }
        };
        if (process.domain) {
          return cookieSetter();
        }
        var d = domain.create();
        d.add(req);
        d.add(res);
        d.run(cookieSetter);
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
}).call(this);
