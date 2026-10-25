# 《汉字绿洲》美术素材与 360° 观看方案

## 已备素材

- `dist/assets/oasis/panorama/day.webp` 与 `night.webp`：同一虚构绿洲的日夜 2:1 全景远景。六境沿用相同山脊、村落与水渠位置，前三境逐渐增加植被，第四、五境转暖，最后一境切换夜景。
- `dist/assets/oasis/*.webp`：有透明背景的山、村屋、完整双支柱葡萄廊架、浅水土渠、草药引水台、花藤廊、红岩小道、丰收篮与新芽。配置见 `dist/assets/oasis/scene-manifest.json`。旧版过亮的“瀑布水渠”已从游戏素材中替换，留在 Seagate 的 `HanziOasisArt/rejected` 供回看。
- `dist/assets/glyphs/`：当前题库所需的 32 个构字部件和 25 个成字字形，共 57 个独立透明 WebP，以及单张 `atlas.webp`。`manifest.json` 给出字符到文件及图集格位的映射。没有黄色底板。
- 高清生成原图放在 `/Volumes/Seagate1TB/HanziOasisArt/source/`，场景总览在 `/Volumes/Seagate1TB/HanziOasisArt/review/scene-contact-sheet.jpg`，字形总览在 `/Volumes/Seagate1TB/HanziOasisArt/review/glyph-contact-sheet.png`。网页仓库只保留压缩资源。

## 实景依据与原创处理

只参考地貌与生活材料，不下载或嵌入第三方实景照片。葡萄沟位于火焰山峡谷、受融雪水滋养，来自[新疆维吾尔自治区文化和旅游厅](https://wlt.xinjiang.gov.cn/wlt/c112782/202208/13815eb051894c79a8d1487b6ceb8663.shtml)；坎儿井在极干旱盆地为绿洲供水的原理，见[联合国教科文组织世界遗产中心](https://whc.unesco.org/en/list/1442)；交河夯土与侵蚀质感参考了[联合国教科文组织的遗址介绍](https://www.unesco.emb-japan.go.jp/htm/jiaohe.htm)。我们把红岩、引水渠、普通土屋与葡萄架重新组合为不存在的村庄，没有照搬单张照片或复刻真实遗址布局。

字形使用本机已有的霞鹜文楷 Medium 渲染。原项目的[官方 OFL 1.1 授权](https://github.com/lxgw/LxgwWenKai/blob/main/OFL.txt)允许商业用途；授权全文已放入 `dist/assets/glyphs/OFL.txt`。字形必须由字体精确渲染，不能靠生图模型猜笔画。

## 自转一圈时如何保持连续

1. **远景只用一张 360° 全景**，不把数张普通风景照硬拼，也不复制同一组屋子。全景左右两端只留低特征的沙地与天空；渲染时在背向初始视角的 4% 窄带作边缘融合。目前压缩图左右边缘平均色差约 8–13/255，接缝仍需在运行画面里检查。
2. **近景物件分散放置**：启动方向有水渠与村落，左侧藤架、右侧草药台，转到侧后方才看到红岩小道与丰收篮；没有物件放在 ±180° 接缝。叶、水光、花与灯各自循环且时间略错开，山体和房屋不循环移动。
3. **六境复用同一空间**：按境逐步出现物件，色温缓变；第五境到第六境可把日夜图以短时淡入淡出切换。这样既节省手机内存，也比六张互不相干的全景更自然。

## 定位的真实边界

普通手机网页可以在有方向传感器时实现**原地转身看全景**；这只追踪朝向，不知道玩家走了几步，也不能自动认出地板。图卡识别可把近景固定在**图卡平面**，图卡离镜后若没有设备级空间追踪就必须暂停或明确切换为“仅观看全景”。真正把整座绿洲锚在地面、允许走到它背后，需要兼容的 WebXR/AR 设备与浏览器；[MDN 说明 WebXR 可用性受设备和浏览器限制](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Startup_and_shutdown)。游戏应先提供低配可玩的图卡模式，再为支持空间追踪的设备加地面放置；不能把前者宣传为房间固定的 360° AR。

此文件是素材与组合方案。图集、全景及近景图片尚未接入公开网页；真实手机上的接缝、帧率、手势与场景遮挡仍要在集成后检查。
