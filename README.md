# luogu-paintboard-bot
在 luogu 冬日绘版上自动画画。See: <https://www.luogu.com.cn/discuss/740206>
## 使用
```sh
npm install
npm run compile
node ./dist/src [-m <mirror>] <image> <width> <x> <y> [tokens...]
```
- `mirror`: 镜像源，默认 `https://www.oi-search.com/paintboard/`。
- `image`: 图片路径。
- `width`: 绘画的宽度。
- `x`, `y`: 绘画位置。
- `tokens`: 绘画使用的 tokens 列表，形如：`uid:token` 的形式填写。有多个使用空格分隔。