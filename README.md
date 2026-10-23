# 汉字图卡 AR

无需安装 App 的手机网页游戏：打开 HTTPS 页面，允许相机，对准 `dist/assets/turpan-card.jpg` 图卡后，用拇指和食指捏合偏旁完成「吐、鲁、番」组字。

## 本地测试

```sh
python3 -m http.server 4174 --directory dist
```

正式使用必须从 HTTPS 地址打开，浏览器才会允许相机。
