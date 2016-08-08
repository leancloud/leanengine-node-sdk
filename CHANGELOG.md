# 更新日志

## v1.2.1

* 升级 JavaScript SDK 到 [leancloud-storage 1.3.2](https://github.com/leancloud/javascript-sdk/releases)

## v1.2.0

* 升级 JavaScript SDK 到 [leancloud-storage 1.3.0](https://github.com/leancloud/javascript-sdk/releases)
* 支持 Koa，相关文档见 <https://github.com/leancloud/docs/pull/1403>

## v1.1.0 (2016-06-23)

* **可能存在细微不兼容** 升级 JavaScript SDK 到 [leancloud-storage 1.0.0](https://github.com/leancloud/javascript-sdk/releases)
* **存在细微不兼容** 强制检查 Class Hook、User Hook、实时通讯 Hook 的签名信息，确保请求来自 LeanCloud（签名错误的请求会打印一条日志）
* 使用 AV.Cloud.run 运行云函数时，被运行的云函数将会得到和 HTTP 调用时结构一致的 request

## v1.0.1 (2016-06-15)

* 添加对 X-LC-UA 头的跨域支持（适用 JavaScript SDK 1.x）

## v1.0.0 (2016/05/31)

* 支持新的初始化方式。
* 更新至 JavaScript SDK 1.0.0-rc9.1.
* 彻底废弃了 currentUser.
* 默认启用与 Promise/A+ 兼容的错误处理逻辑。
* 将中间件拆分到了单独的文件。
* AV.Cloud.run 支持 remote 参数。
* AV.Cloud.define 支持 fetchUser 参数。

详见文档 [升级到云引擎 Node.js SDK 1.0](https://leancloud.cn/docs/leanengine-node-sdk-upgrade-1.html)。

## v0.4.0 (2016/02/01)

### Bug Fixes

* disableHook API 增加签名机制 ([d942c4d](https://github.com/leancloud/leanengine-node-sdk/commit/d942c4d))

### Features

* Cloud 函数和 Hook 函数增加 15 秒超时时间限制 ([dfcd1a8](https://github.com/leancloud/leanengine-node-sdk/commit/dfcd1a8))
* 调整请求正文大小的限制为 20MB ([1d2e26b](https://github.com/leancloud/leanengine-node-sdk/commit/1d2e26b))

## v0.3.0 (2015/12/31)

* [增加 disableHook 的 API ](https://github.com/leancloud/leanengine-node-sdk/pull/41): 为了防止 Hook 函数死循环调用，增加相关 API。默认情况下 request.object 会自动设置，如果用户自行创建了对象（比如对象重新 fetch 或者 createWithoutData 创建对象），为了避免循环调用，需要明确的调用该 API。
* [修复 cookieSession 获取用户信息方式](https://github.com/leancloud/leanengine-node-sdk/pull/40)：不应该使用 fetch 接口，因为这样总是使用 id 而忽略 sessionToken。改为使用 become 接口。

## v0.2.0 (2015/10/22)

* [支持 beforeUpdate](https://github.com/leancloud/leanengine-node-sdk/pull/31): 可以通过该 hook 了解发生变更的字段，并且可以通过 error 回调拒绝本次修改请求。
* [支持 RPC 调用，接受和返回 AVObject](https://github.com/leancloud/leanengine-node-sdk/commit/b4d027a16b188738c3c24ebd876b81e5e8d00eca)：和之前的 run 方法不同，现在可以在 Client 端调用云引擎的 Cloud 函数，直接返回 AVObject，具体 API 详见各 SDK。

## v0.1.6 (2015/08/28)

* [修改 Cloud 函数的未捕获异常处理器](https://github.com/leancloud/leanengine-node-sdk/commit/d7e3f0b519b2ed7301d8ec093c952ede6ac0ee01): 出现未捕获异常时，如果还没有发出 response 响应，才发出 500 响应，否则直接忽略。
* [支持短 header 请求](https://github.com/leancloud/leanengine-node-sdk/commit/3c8c0621c63ab15261ec0ae4d0322bfc8915ed5d): 为了缩短请求的长度，我们更改了 header 中关于 appId 等 key 的长度，比如 `x-avoscloud-application-id` 改为 `x-lc-id`。
* [AV.BigQuery 更名为 AV.Insight](https://github.com/leancloud/leanengine-node-sdk/commit/4bfec5149b322003cff550294ff9937a0feb9476): 配合产品更名，如果仍然使用 AV.BigQuery 将会收到一条警告日志 `AV.BigQuery is deprecated, please use AV.Insight instead.`。

## v0.1.5 (2015/07/31)

* [#19](https://github.com/leancloud/leanengine-node-sdk/pull/19) Bugfix: 修正 AV.Cloud.httpRequest 提示 qs 没有定义的错误。
* [#20](https://github.com/leancloud/leanengine-node-sdk/pull/20) Bugfix: cookieSession 中间件在 sessionToken 失效时能正确处理。

## v0.1.4 (2015/06/03)

* [bed2fdd](https://github.com/leancloud/leanengine-node-sdk/commit/bed2fdd72ae5d3fd787de64f081e3efc79bf6c3d) Bugfix: hook 函数 AV.User.current() 方法未能正确获取 User 对象
* [a64c7c1](https://github.com/leancloud/leanengine-node-sdk/commit/a64c7c1ec5ce4a065b018aab1aecef3f43eb7029) Bugfix: hook 函数可能造成死循环

## v0.1.3 (2015/05/30)

* [ecc0014](https://github.com/leancloud/leanengine-node-sdk/commit/ecc0014a68c313f62fe11d395cf556acd5fbebf6) Bugfix: hook 函数返回对象的格式有误

## v0.1.2 (2015/05/29)

* [999472b](https://github.com/leancloud/leanengine-node-sdk/commit/999472b8220c534ab96ac77406056e898ff4dcde) Bugfix: 简单跨域请求没有设置 Access-Control-Allow-Origin
* [425cf2a](https://github.com/leancloud/leanengine-node-sdk/commit/425cf2a4669f1de1a1cf66304ac9180ce21a43b9) Bugfix: AV.Cloud.run 方法返回一个 promise

## v0.1.1 (2015/05/28)

* [#2](https://github.com/leancloud/leanengine-node-sdk/pull/2) 增加 Hook: BigQuery job on complete
* [#3](https://github.com/leancloud/leanengine-node-sdk/pull/3) CookieSession 变量会泄露到全局

## v0.1.0 (2015/05/22)

* 正式 release。
