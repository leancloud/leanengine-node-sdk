## LeanEngine 路由、云储存调用统计

这个中间件会统计 express 程序被访问的各路由的响应代码、响应时间，以及程序所调用的 LeanCloud API 的名称、响应结果（成功或失败）、响应时间。

**在你的 express 程序中添加**：

    var statusLogger = require('leanengine/lib/status-logger');
    var AV = require('leanengine');
    var app = express();
    app.use(statusLogger({AV: AV}));

等它收集一段时间数据，就可以打开你的站点下的 `/__lcStatusLogger` 查看统计图表了，basicAuth 的账号是 appId，密码是 masterKey.

数据会储存在你的应用云储存中的 `LeanEngineReponseLog5Min` 和 `LeanEngineCloudAPI5Min` 这两个 Class 中，你的程序（每个实例）每五分钟会分别上传一条记录，每天会上传大概五百条。

**定义自己的 URL 分组或忽略规则**：

你可以给 statusLogger 传一个 rules 参数，定义一些处理 URL 的规则：

    app.use(statusLogger({
      AV: AV,
      rules: [
        {match: /^GET \/(js|css).+/, rewrite: 'GET /$1'} // 将例如 /js/jquery.js 的 URL 重写为 /js
        {match: /^GET \/public/, ignore: true}           // 忽略 GET /public 开头的 URL
      ]
    }));

**statusLogger 的更多选项**：

* specialStatusCodes, 数字数组，为了记录合适大小的数据，默认只会单独记录几个常见的 statusCode, 你可以覆盖默认的值。
