# 钟表行业权威问答培训平台 · 纯静态版

GitHub Pages 托管用。纯前端，无任何后端依赖。

## 使用
直接双击 index.html 即可在浏览器打开；或把本目录所有文件上传到 GitHub 仓库根目录，在仓库设置中开启 GitHub Pages（Source 选 main 分支根目录）。

## 说明
- 464 条问答数据已内嵌在 js/data.js（window.STATIC_DB），无需接口。
- 登录为演示模式：任意 11 位手机号 + 验证码 123456 即可登录。
- 提问、纠错反馈、登录状态保存在浏览器 localStorage，仅本机可见，不会上传到服务器，管理员也收不到。
- 管理后台不包含在本静态版内。
- 所有资源使用相对路径，可放任意子目录。

## 文件结构
index.html          入口
js/data.js          内嵌数据（464 条问答 + 分类 + 标签）
js/static-api.js    本地数据层（复刻后端读接口 + localStorage 写）
js/app.js           页面逻辑
css/style.css       样式
img/*.svg           示意图标（17 个）
