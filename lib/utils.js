'use strict';

var crypto = require('crypto');

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
  onIMConversationStart: '_conversationStart',
  onIMConversationStarted: '_conversationStarted',
  onIMConversationAdd: '_conversationAdd',
  onIMConversationRemove: '_conversationRemove',
  onIMConversationUpdate: '_conversationUpdate'
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
  return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
};

exports.endsWith = function(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
};
