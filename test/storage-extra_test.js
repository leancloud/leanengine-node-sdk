'use strict';
var AV = require('../lib/storage-extra.js');

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var config = require('./config');
var utils = require('../lib/utils');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/hello', function (req, res) {
  res.send('Hello, ' + req.query.name);
});

app.post('/hello', function (req, res) {
  res.send('Hello, ' + req.body.name);
});

var server = app.listen(3333, function () {});

after(function() {
  server.close();
});

describe('storage-extra', function() {
  it('httpRequest', function(done) {
    AV.Cloud.httpRequest({
      url: 'http://localhost:3333/hello',
      params: { name : '张三' },
      success: function(res) {
        res.status.should.equal(200);
        res.text.should.equal('Hello, 张三');
        done();
      },
      error: function(httpResponse) {
        throw httpResponse.text;
      }
    });
  });

  it('httpRequest', function(done) {
    AV.Cloud.httpRequest({
      url: 'http://localhost:3333/hello',
      method: 'POST',
      body: {
        name: "张三"
      },
      success: function(res) {
        res.status.should.equal(200);
        res.text.should.equal('Hello, 张三');
        done();
      },
      error: function(httpResponse) {
        throw httpResponse.text;
      }
    });
  });

  it('signDisableHook', function() {
    utils.signHook(config.masterKey, '__before_for_TestClass', 1453711871302).should.equal('1453711871302,a9611dbc226eed1a5f4aa0e4fa20e2d014aeaeb8');
  });

});
