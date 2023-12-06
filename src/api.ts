import axios from 'axios';
import qs from 'qs';
import { WebSocket } from 'ws';
import { sleep } from '.';

axios.defaults.baseURL = "https://www.oi-search.com/paintboard/";

function toByteStr(x: number) {
    if (x < 0 || x > 0xff) throw "Invalid byte";
    let res = x.toString(16);
    if (res.length == 0) res = "00";
    else if (res.length == 1) res = "0" + res;
    return res;
}
export type Color = [number, number, number];
export function init(mirror: string) {
    axios.defaults.baseURL = mirror;
}
export async function draw(x: number, y: number, color: Color, uid: number, token: string) {
    let s = qs.stringify({
        x, y,
        color: toByteStr(color[0]) + toByteStr(color[1]) + toByteStr(color[2]),
        uid, token
    });
    try {
        let res = await axios.post("/paint", s);
        if (res.data?.status != 200) throw "返回错误：" + res.data?.data;
    } catch (err) {
        await sleep(5000);
        console.error("绘画时发生错误：",err);
        return await draw(x, y, color, uid, token);
    }
}

export async function getpaintboard() {
    try {
        let res = (await axios.get("/board")).data as string;
        var arr: Color[][] = Array.from({ length: 1000 }, () => new Array(600).fill(undefined));
        for (let i = 0; i < 1000; ++i) for (let j = 0; j < 600; ++j) {
            let p = i * 1000 + i + j;
            arr[i][j] = [
                parseInt(res.substring(p + 0, p + 2), 16),
                parseInt(res.substring(p + 2, p + 4), 16),
                parseInt(res.substring(p + 4, p + 6), 16),
            ]
        }
        return arr;
    } catch (err) {
        console.error("获取画板时发生错误：",err);
        await sleep(5000);
        return await getpaintboard();
    }
}

export async function websocket(paintboard: Color[][]) {
    try {
        let ws = new WebSocket("wss://www.oi-search.com:11451/paintboard/ws");
        ws.on("message", (data: Buffer) => {
            if (data[0] == 0xfa)
                paintboard[data[2] * 0xff + data[1]][data[4] * 0xff + data[3]] = [data[5], data[6], data[7]];
            else if (data[0] == 0xfd) (async () => {
                let p = await getpaintboard();
                for (let i = 0; i < 1000; ++i) paintboard[i] = p[i];
            })();
        });
        ws.on("close", () => websocket(paintboard));
    } catch (err) {
        console.log("建立 websocket 连接时发生错误：",err);
        await sleep(5000);
        return await websocket(paintboard);
    }
}