'use strict';

var crypto = require('crypto');
var parseForwarded = require('forwarded-parse');
var ipaddr = require('ipaddr.js');
var _ = require('underscore');

exports.hookNameMapping = {
  beforeSave: '__before_save_for_',
  beforeUpdate: '__before_update_for_',
  afterSave: '__after_save_for_',
  afterUpdate: '__after_update_for_',
  beforeDelete: '__before_delete_for_',
  afterDelete: '__after_delete_for_',
  onVerified: '__on_verified_',
  onLogin: '__on_login_'
};

exports.realtimeHookMapping = {
  onIMMessageReceived: '_messageReceived',
  onIMReceiversOffline: '_receiversOffline',
  onIMMessageSent: '_messageSent',
  onIMMessageUpdate: '_messageUpdate',
  onIMConversationStart: '_conversationStart',
  onIMConversationStarted: '_conversationStarted',
  onIMConversationAdd: '_conversationAdd',
  onIMConversationAdded: '_conversationAdded',
  onIMConversationRemove: '_conversationRemove',
  onIMConversationRemoved: '_conversationRemoved',
  onIMConversationUpdate: '_conversationUpdate',
  onIMClientOnline: '_clientOnline',
  onIMClientOffline: '_clientOffline',
  onIMClientSign: '_rtmClientSign'
};

exports.unauthResp = function(res) {
  res.statusCode = 401;
  res.setHeader('content-type', 'application/json; charset=UTF-8');
  return res.end(JSON.stringify({ code: 401, error: 'Unauthorized.' }));
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
      remoteAddress: req && req.headers && getRemoteAddress(req)
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

var getRemoteAddress = exports.getRemoteAddress = function(req) {
  var forwardedClient = exports.getForwardedClient(req)

  if (forwardedClient) {
    return forwardedClient.for
  } else {
    return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
  }
};

exports.endsWith = function(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

exports.getForwardedClient = function getForwardedClient(req) {
  if (req.headers['forwarded']) {
    try {
      const forwards = parseForwarded(req.headers['forwarded']).reverse()

      for (var i = 0; i < forwards.length; i++) {
        if (!forwards[i].for) {
          return
        }

        var range = ipaddr.parse(forwards[i].for).range()

        if (!_.include(['loopback', 'private'], range) || i === forwards.length - 1) {
          return _.extend(forwards[i], {range: range})
        }
      }
    } catch (err) {
      console.error('LeanEngine: parse Forwarded header failed', req.headers['forwarded'], err.stack)
    }
  }
}
