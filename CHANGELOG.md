## 更新日志

### v0.1.5 (2015/07/31)

* [#19](https://github.com/leancloud/leanengine-node-sdk/pull/19) Bugfix: 修正 AV.Cloud.httpRequest 提示 qs 没有定义的错误。
* [#20](https://github.com/leancloud/leanengine-node-sdk/pull/20) Bugfix: cookieSession 中间件在 sessionToken 失效时能正确处理。

### v0.1.4 (2015/06/03)

* [bed2fdd](https://github.com/leancloud/leanengine-node-sdk/commit/bed2fdd72ae5d3fd787de64f081e3efc79bf6c3d) Bugfix: hook 函数 AV.User.current() 方法未能正确获取 User 对象
* [a64c7c1](https://github.com/leancloud/leanengine-node-sdk/commit/a64c7c1ec5ce4a065b018aab1aecef3f43eb7029) Bugfix: hook 函数可能造成死循环

### v0.1.3 (2015/05/30)

* [ecc0014](https://github.com/leancloud/leanengine-node-sdk/commit/ecc0014a68c313f62fe11d395cf556acd5fbebf6) Bugfix: hook 函数返回对象的格式有误

### v0.1.2 (2015/05/29)

* [999472b](https://github.com/leancloud/leanengine-node-sdk/commit/999472b8220c534ab96ac77406056e898ff4dcde) Bugfix: 简单跨域请求没有设置 Access-Control-Allow-Origin
* [425cf2a](https://github.com/leancloud/leanengine-node-sdk/commit/425cf2a4669f1de1a1cf66304ac9180ce21a43b9) Bugfix: AV.Cloud.run 方法返回一个 promise

### v0.1.1 (2015/05/28)

* [#2](https://github.com/leancloud/leanengine-node-sdk/pull/2) 增加 Hook: BigQuery job on complete
* [#3](https://github.com/leancloud/leanengine-node-sdk/pull/3) CookieSession 变量会泄露到全局

### v0.1.0 (2015/05/22)

* 正式 release。
