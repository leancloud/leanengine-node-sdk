## 发布新版本

- 将所有要发布的 PR 合并到 master
- 再次运行测试（`npm test`）
- 修改 CHANGELOG、根据 [semver](https://semver.org/) 修改 `package.json` 中的版本号
- 提交上述改动，`git commit -m '🔖Prepare 3.x.x'`
- `git tag v3.x.x`
- `npm publish`（需先加入 [@leancloud](https://www.npmjs.com/org/leancloud)）
- `git push --tags`
- 在 [GitHub 的 releases](https://github.com/leancloud/leanengine-node-sdk/releases) 创建 Release，并填入 CHANGELOG 中的内容
