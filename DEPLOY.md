# BOD 免费部署指南

推荐先用 Netlify 或 GitHub Pages 部署静态站。当前版本不需要后端。

## 方案 A：Netlify Drop，最快

1. 打开 <https://app.netlify.com/drop>
2. 登录或注册 Netlify 免费账号。
3. 上传本项目目录，或上传 `bod-release.zip`。
4. Netlify 会生成一个免费网址。
5. 在 Netlify 的 Site settings 中可以修改站点名。

适合第一批用户试用，最快几分钟上线。

## 方案 B：GitHub Pages，适合长期维护

1. 在 GitHub 新建一个公开仓库，例如 `bod-fitness`.
2. 上传这些文件：`index.html`、`styles.css`、`app.js`、`README.md`、`.nojekyll`。
3. 打开仓库 Settings -> Pages。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/root`。
6. 保存后等待 GitHub 生成访问地址。

适合以后继续迭代、记录版本和多人协作。

## 上线前检查

- 打开首页后能看到新用户目标引导。
- 记录训练后能更新消耗、目标进度和成就。
- 分享按钮在手机浏览器中可以打开系统分享。
- 页面说明了数据保存在本设备。

## 后续升级建议

- 有稳定用户后再添加账号系统和云同步。
- 收集 10-30 个真实用户连续 7 天的使用反馈。
- 根据反馈优先优化记录速度、目标算法和成就反馈。
