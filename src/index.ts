import { program } from 'commander';
import { Color, draw, getpaintboard, init, websocket } from './api';
import Jimp from 'jimp';
import { EventEmitter } from 'events';
import { Queue } from './queue';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function start(image: string, width: string, sx: string, sy: string, token: string[], mirror?: string) {
    let x = +sx, y = +sy;

    if (mirror) init(mirror);
    let img = await Jimp.read(image);
    img.scale(+width / img.getWidth());
    let map: Color[][] = [];

    let flag = -1;
    let event = new EventEmitter();
    const update_map = async () => {
        map = await getpaintboard();
        event.emit("update");
    }, check = () => {
        if (flag != -1) return;
        let all = 0, undraw = 0;
        for (let i = 0; i < img.getWidth(); ++i) for (let j = 0; j < img.getHeight(); ++j) {
            let color = img.getPixelColor(i, j);
            let r = color >> 24 & 0xff, g = color >> 16 & 0xff, b = color >> 8 & 0xff, a = (color & 0xff) / 256;
            if (a <= 0.5) continue;
            ++all;
            if (map[x + i][y + j][0] != r || map[x + i][y + j][1] != g || map[x + i][y + j][2] != b) ++undraw;
        }
        if (undraw <= all * 0.2) flag = token.length;
        console.log(`drawed: ${all-undraw}/${all} ${1-undraw/all}`);
    }
    await update_map();
    websocket(map, update_map, event);
    (async () => {
        check();
        while (true) {
            await sleep(300 * 1000);
            update_map();
            check();
        }
    })();
    for (let i of token) {
        let p = i.indexOf(':');
        (async (uid: string, token: string) => {
            while (flag == -1) {
                let i = Math.floor(Math.random() * img.getWidth()), j = Math.floor(Math.random() * img.getHeight());
                let color = img.getPixelColor(i, j);
                let r = color >> 24 & 0xff, g = color >> 16 & 0xff, b = color >> 8 & 0xff, a = (color & 0xff) / 256;
                if (a > 0.5 && (map[x + i][y + j][0] != r || map[x + i][y + j][1] != g || map[x + i][y + j][2] != b)) {
                    await draw(x + i, y + j, [r, g, b], uid, token);
                    await sleep(30*1000);
                }
            }
            --flag;
        })(i.substring(0, p), i.substring(p + 1));
    }
    while (flag != 0) await sleep(1000);
    const q = new Queue<{ x: number, y: number }>();
    const push_queue = (pos: { x: number, y: number }) => {
        if (pos.x >= x && pos.y >= y && pos.x < x + img.getWidth() && pos.y < y + img.getHeight())
            q.push(pos);
        return;
    };
    event.on("change", push_queue);
    event.on("update", () => {
        q.clear();
        for (let i = 0; i < img.getWidth(); ++i) for (let j = 0; j < img.getHeight(); ++j) {
            let color = img.getPixelColor(i, j);
            let r = color >> 24 & 0xff, g = color >> 16 & 0xff, b = color >> 8 & 0xff, a = (color & 0xff) / 256;
            if (a <= 0.5) continue;
            if (map[x + i][y + j][0] != r || map[x + i][y + j][1] != g || map[x + i][y + j][2] != b) push_queue({ x: x + i, y: y + j });
        }
    });
    await update_map();
    for (let i of token) {
        let p = i.indexOf(':');
        await sleep(10);
        (async (uid: string, token: string) => {
            while (true) {
                let p = q.front();
                if (p) {
                    q.pop();
                    let color = img.getPixelColor(p.x - x, p.y - y);
                    let r = color >> 24 & 0xff, g = color >> 16 & 0xff, b = color >> 8 & 0xff, a = (color & 0xff) / 256;
                    if (a <= 0.5 || (map[p.x][p.y][0] == r && map[p.x][p.y][1] == g && map[p.x][p.y][2] == b)) continue;
                    await draw(p.x, p.y, [r, g, b], uid, token);
                    await sleep(30*1000-50);
                }
                await sleep(50);
            }
        })(i.substring(0, p), i.substring(p + 1));
    }
};

program
    .argument("<image> <width> <x> <y> [tokens...]")
    .option("-m, --mirror <mirror>", "Mirrors. Default is https://www.oi-search.com/paintboard/.")
    .action((args: string[], options: { mirror?: string }) => start(args[0], args[1], args[2], args[3], args.slice(4), options.mirror));

program.version("0.0.0").parse();
