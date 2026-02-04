import * as PIXI from "pixi.js";

const app = new PIXI.Application();

await app.init({
    resizeTo: window,
    backgroundColor: 0x1e1e1e
});

// const app = Application.init();

document.body.appendChild(app.canvas as HTMLCanvasElement);

// test object
const box = new PIXI.Graphics();
box.rect(0, 0, 50, 50);
box.fill(0xff3366);
box.x = 100;
box.y = 100;

app.stage.addChild(box);

// minimal loop
app.ticker.add(() => {
  box.x += 1;
});