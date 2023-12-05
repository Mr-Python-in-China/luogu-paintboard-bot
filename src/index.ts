import { program } from 'commander';
import { draw, getpaintboard, init, websocket } from './api';
import Jimp from 'jimp';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const thw = true;

export default async function start(image: string, width: string, x: string, y: string, token: string[], mirror?: string) {
    if (mirror) init(mirror);
    let img = await Jimp.read(image);
    img.scale(+width / img.getWidth());
    let map = await getpaintboard();
    websocket(map);
    for (let i of token) {
        let p = i.indexOf(':');
        (async (uid: string, token: string) => {
            while (true) {
                let i = Math.floor(Math.random() * img.getWidth()), j = Math.floor(Math.random() * img.getHeight());
                let color = img.getPixelColor(i, j);
                let r = color >> 24 & 0xff, g = color >> 16 & 0xff, b = color >> 8 & 0xff;
                if (map[+x + i][+y + j][0] != r || map[+x + i][+y + j][1] != g || map[+x + i][+y + j][2] != b) {
                    try {
                        await draw(+x + i, +y + j, [r, g, b], +uid, token);
                    } catch (error) {
                        if (thw) throw error;
                    }
                    await sleep(4950);
                }
                await sleep(50);
            }
        })(i.substring(0, p), i.substring(p + 1));
    }
};

program
    .argument("<image> <width> <x> <y> [tokens...]")
    .option("-m, --mirror <mirror>", "Mirrors. Default is https://www.oi-search.com/paintboard/.")
    .action((args:string[],options:{mirror?:string})=>start(args[0],args[1],args[2],args[3],args.slice(4),options.mirror));

program.version("0.0.0").parse();
