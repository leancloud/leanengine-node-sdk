'use strict';
var http = require('http');
var https = require('https');
var urlParser = require('url');
var util = require('util');
var qs = require('querystring');
var iconvlite = require('iconv-lite');
var utils = require('./utils');
var AV = require('avoscloud-sdk');
var crypto = require('crypto');
var debug = require('debug')('AV:LeanEngine');

AV._config.disableCurrentUser = true;

// 调用 API 时增加 prod 信息
if (!AV._old_request) {
  AV._old_request = AV._request;
  AV._request = function (route, className, objectId, method, dataObject, sessionToken) {
    if (!dataObject) {
      dataObject = {};
    }
    dataObject._ApplicationProduction = AV.Cloud.__prod;
    return AV._old_request(route, className, objectId, method, dataObject, sessionToken);
  };
}

var mimeTypes = [
  {
    pattern: /^text\/plain.*/i,
    process: function(res) {
      return res.text;
    }
  }, {
    pattern: /^application\/json.*/i,
    process: function(res) {
      return JSON.parse(res.text);
    }
  }, {
    pattern: /^application\/x-www-form-urlencoded/i,
    process: function(res) {
      return qs.parse(res.buffer);
    }
  }
];

var trySetData = function(httpRes) {
  var contentType, e, type;
  contentType = httpRes.headers['content-type'];
  mimeTypes.some(function(mimeType) {
    if (mimeType.pattern.exec(contentType)) {
      type = mimeType;
      return true;
    }
  });
  if (type) {
    try {
      httpRes.data = type.process(httpRes);
    } catch (_error) {
      e = _error;
      httpRes.data = httpRes.buffer;
    }
  } else {
    httpRes.data = httpRes.buffer;
  }
};

var HTTPResponse = (function() {
  function HTTPResponse(buffer, headers, response, status, text) {
    this.buffer = buffer;
    this.headers = headers || {};
    this.response = response;
    this.status = status;
    this.text = text;
  }

  return HTTPResponse;
})();

var castBody = function(body, contentType) {
  if (!body) {
    return body;
  } else if (typeof body === 'string') {
    return body;
  } else if (Buffer.isBuffer(body)) {
    return body;
  } else if (typeof body === 'object') {
    if (/^application\/json.*/i.test(contentType)) {
      return new Buffer(JSON.stringify(body));
    } else if ((!contentType) || /^application\/x-www-form-urlencoded/i.test(contentType)) {
      return qs.stringify(body);
    }
    throw 'Invalid request body.';
  } else {
    throw 'Invalid request body.';
  }
};

// 增加 Cloud.httpRequest 的支持
AV.Cloud.httpRequest = function(options) {
  var body, contentLen, contentType, headers, hostname, httpResponse, http_module, method, params, parsedRes, path, port, promise, request, requestOptions, search, text, theBody, url;
  options = options || {};
  options.agent = false;
  url = options.url;
  http_module = http;
  if (/^https.*/.exec(url)) {
    http_module = https;
  }
  promise = new AV.Promise();
  params = options.params;
  headers = options.headers || {};
  method = options.method || 'GET';
  body = options.body;
  text = options.text ? options.text : true;
  delete options.params;
  delete options.body;
  delete options.url;
  delete options.text;
  parsedRes = urlParser.parse(url);
  hostname = parsedRes.hostname;
  port = parsedRes.port || 80;
  if ((/^https.*/.exec(url)) && (!parsedRes.port)) {
    port = 443;
  }
  path = parsedRes.path;
  search = parsedRes.search;
  if (params) {
    path = !search ? path + '?' : path + '&';
    if (utils.typeOf(params) === 'string') {
      params = qs.parse(params);
    }
    params = qs.stringify(params);
    path = path + params;
  }
  contentType = headers['Content-Type'];
  if ((method === 'POST') && (!contentType)) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8';
  }
  theBody = castBody(body, headers['Content-Type']);
  contentLen = theBody ? theBody.length : 0;
  if (!headers['Content-Length']) {
    headers['Content-Length'] = contentLen;
  }
  requestOptions = {
    host: hostname,
    port: port,
    method: method,
    headers: headers,
    path: path
  };
  requestOptions = util._extend(requestOptions, options);
  httpResponse = new HTTPResponse();
  request = http_module.request(requestOptions, function(res) {
    var chunkList, contentLength, encoding, matches, responseContentType;
    httpResponse.status = res.statusCode;
    httpResponse.headers = res.headers;
    responseContentType = res.headers['content-type'] || '';
    encoding = (matches = responseContentType.match(/.*charset=(.*)/i)) ? matches[1].trim().replace(/'|"/gm, '') : 'utf8';
    if (encoding.toLowerCase() === 'utf-8') {
      encoding = 'utf8';
    }
    if (text) {
      httpResponse.text = '';
    }
    chunkList = [];
    contentLength = 0;
    res.on('data', function(chunk) {
      contentLength += chunk.length;
      return chunkList.push(chunk);
    });
    return res.on('end', function() {
      var chunk, pos, _i, _len;
      httpResponse.buffer = new Buffer(contentLength);
      pos = 0;
      for (_i = 0, _len = chunkList.length; _i < _len; _i++) {
        chunk = chunkList[_i];
        chunk.copy(httpResponse.buffer, pos);
        pos += chunk.length;
      }
      if (text) {
        httpResponse.text = iconvlite.decode(httpResponse.buffer, encoding);
      }
      trySetData(httpResponse);
      if (httpResponse.status < 200 || httpResponse.status >= 400) {
        return promise.reject(httpResponse);
      } else {
        return promise.resolve(httpResponse);
      }
    });
  });
  request.setTimeout(options.timeout || 10000, function() {
    return request.abort();
  });
  request.on('error', function(e) {
    httpResponse.text = util.inspect(e);
    httpResponse.status = 500;
    return promise.reject(httpResponse);
  });
  request.end(theBody);
  return promise._thenRunCallbacks(options);
};

AV.Object.prototype.disableBeforeHook = function() {
  this.set('__before', signDisableHook('__before_for_' + this.className, new Date().getTime()));
};

AV.Object.prototype.disableAfterHook = function() {
  this.set('__after', signDisableHook('__after_for_' + this.className, new Date().getTime()));
};

var signDisableHook = function(hookName, ts) {
  var masterKey = process.env.LC_APP_MASTER_KEY;
  var sign = crypto.createHmac('sha1', masterKey)
    .update(hookName + ':' + ts)
    .digest('hex');
  return ts + ',' + sign;
};

module.exports = AV;
