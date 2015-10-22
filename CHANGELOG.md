## 更新日志

### v0.2.0 (2015/10/22)

* [支持 beforeUpdate](://github.com/leancloud/leanengine-node-sdk/pull/31): 可以通过该 hook 了解发生变更的字段，并且可以通过 error 回调拒绝本次修改请求。
* [支持 RPC 调用，接受和返回 AVObject](https://github.com/leancloud/leanengine-node-sdk/commit/b4d027a16b188738c3c24ebd876b81e5e8d00eca)：和之前的 run 方法不同，现在可以在 Client 端调用云引擎的 Cloud 函数，直接返回 AVObject，具体 API 详见各 SDK。

### v0.1.6 (2015/08/28)

* [修改 Cloud 函数的未捕获异常处理器](https://github.com/leancloud/leanengine-node-sdk/commit/d7e3f0b519b2ed7301d8ec093c952ede6ac0ee01): 出现未捕获异常时，如果还没有发出 response 响应，才发出 500 响应，否则直接忽略。
* [支持短 header 请求](https://github.com/leancloud/leanengine-node-sdk/commit/3c8c0621c63ab15261ec0ae4d0322bfc8915ed5d): 为了缩短请求的长度，我们更改了 header 中关于 appId 等 key 的长度，比如 `x-avoscloud-application-id` 改为 `x-lc-id`。
* [AV.BigQuery 更名为 AV.Insight](https://github.com/leancloud/leanengine-node-sdk/commit/4bfec5149b322003cff550294ff9937a0feb9476): 配合产品更名，如果仍然使用 AV.BigQuery 将会收到一条警告日志 `AV.BigQuery is deprecated, please use AV.Insight instead.`。

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
