# 汉字图卡 AR

无需安装 App 的手机网页游戏：扫描实体图卡角落的二维码，二维码应指向
`https://visdar.github.io/hanzi-card-ar/?play=1`。手机会直接打开游戏并请求相机权限；
随后对准图卡，用拇指和食指捏合偏旁完成组字。

发布后的可打印入口为 [`print-card.html`](https://visdar.github.io/hanzi-card-ar/print-card.html)：二维码位于识别图卡外侧，因此不会破坏图像定位素材。

普通手机相机不能把一张任意图片直接变成正在运行的游戏；二维码是 iPhone、iPad、Android 都能识别的通用启动入口。可打印图卡把二维码设计为“汉字绿洲印”：它看起来是图卡的一部分，但仍保留扫码必需的对比度和留白。二维码打开的是网页，玩家不需要手动搜索或输入网址。

## 本地测试

```sh
python3 -m http.server 4174 --directory dist
```

正式使用必须从 HTTPS 地址打开，浏览器才会允许相机。
