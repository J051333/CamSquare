let canvas;
let ctx;
let video;
let vidCanvas;
let vidCtx;
let storeCanvas;
let storeCtx;
let cellCountX = 40;
let cellCountY = 24;
let timeScale = 0.3;
let magCap = 2 / 60; // MUST BE A RATIO TO STAY SANE
let maxColorOffset = 100; // both directions i.e. 50 results in ±25
let timeout = 25;
let cameraAccess = false;
let bgPlay = true;
let basePlay = true;
let manualPause = false;
let baseInfluence = true;
let textColor = "#000000";
let customBgColor = "#00000000";
let textType = "time";
let customText = "00:00";
let drawLoop;

// Array of [position, step]
const positions = [];
const colors = [];
let customBaseColor = [];

function draw() {
    if (bgPlay) {
        colors[colors.length - 1] = averageImage();
    }
    ctx.fillStyle = colors[colors.length - 1];
    ctx.fillRect(0, 0, innerWidth * window.devicePixelRatio, innerHeight * window.devicePixelRatio);
    computePosition();

    tile();
}

function computePosition() {
    for (let i = 0; i < cellCountX; i++) {
        for (let j = 0; j < cellCountY; j++) {
            positions[i][j].pos += positions[i][j].timeStep;
            if (positions[i][j].pos >= 180) {
                positions[i][j].pos = 0;
            }
        }
    }
}

async function tile() {
    if (!cameraAccess) return;
    const imageData = imageDataTo2dArray(capture("base"));
    const cellWidth = Math.floor(canvas.width / cellCountX);
    const cellHeight = Math.floor(canvas.height / cellCountY);
    let offsetX = (canvas.width - cellCountX * cellWidth) / 2;
    let offsetY = (canvas.height - cellCountY * cellHeight) / 2;
    let widthOffset = cellWidth / 10;
    let heightOffset = cellHeight / 10;

    if (widthOffset < heightOffset) {
        ctx.lineWidth = widthOffset;
        heightOffset = 0
    } else {
        ctx.lineWidth = heightOffset;
        widthOffset = 0;
    }
    ctx.lineWidth = Math.min(cellWidth / 10, cellHeight / 10);

    let r, g, b, a;

    function drawTiles(i, j) {
        let influence = magCap * Math.sin(positions[i][j].pos);

        let fillCellX = i * cellWidth + offsetX + cellWidth * (influence * baseInfluence);
        let fillCellY = j * cellHeight + offsetY + cellHeight * (influence * baseInfluence);
        let fillCellW = cellWidth - cellWidth * (influence * baseInfluence) * 2;
        let fillCellH = cellHeight - cellHeight * (influence * baseInfluence) * 2;

        if (customBaseColor.length > 0 && customBaseColor[i][j]) {
            ctx.fillStyle = customBaseColor[i][j];
            // console.log(ctx.fillStyle);
            ctx.fillRect(fillCellX, fillCellY, fillCellW, fillCellH);
        }

        ctx.fillStyle = colors[i][j];
        ctx.fillRect(fillCellX, fillCellY, fillCellW, fillCellH);


        let spaceX = cellWidth * influence;
        let spaceY = cellHeight * influence;
        ctx.strokeStyle = "#00000025";

        if (cellWidth > cellHeight) {
            spaceY += ctx.lineWidth / 2;
        } else {
            spaceX += ctx.lineWidth / 2;
        }

        ctx.strokeRect(i * cellWidth + spaceX + offsetX + heightOffset / 2, j * cellHeight + spaceY + offsetY + widthOffset / 2, cellWidth - spaceX * 2 - heightOffset, cellHeight - spaceY * 2 - widthOffset);
        // ctx.strokeRect(i * cellWidth + spaceX / 2, j * cellHeight + spaceY / 2, cellWidth - spaceX, cellHeight - spaceY);
    }

    for (let i = 0; i < cellCountX; i++) {
        for (let j = 0; j < cellCountY; j++) {
            // if (manualPause &&) {
            //     drawTiles(i, j);
            //     continue;
            // }

            r = 0;
            g = 0;
            b = 0;
            a = 0

            let vidCellWidth = Math.floor(vidCanvas.width / cellCountX);
            let vidCellHeight = Math.floor(vidCanvas.height / cellCountY);
            for (let x = 0; x < vidCellWidth; x++) {
                for (let y = 0; y < vidCellHeight; y++) {
                    r += imageData[x + vidCellWidth * i][y + vidCellHeight * j].r;
                    g += imageData[x + vidCellWidth * i][y + vidCellHeight * j].g;
                    b += imageData[x + vidCellWidth * i][y + vidCellHeight * j].b;
                    a += imageData[x + vidCellWidth * i][y + vidCellHeight * j].a;
                }
            }

            r /= vidCellWidth * vidCellHeight;
            g /= vidCellWidth * vidCellHeight;
            b /= vidCellWidth * vidCellHeight;
            a /= vidCellWidth * vidCellHeight;

            colors[i][j] = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a / 255})`;

            drawTiles(i, j);
        }
    }
}

function imageDataTo2dArray(id) {
    const result = [];

    for (let i = 0; i < id.width; i++) {
        const column = [];
        for (let j = 0; j < id.height; j++) {
            let index = (j * id.width + i) * 4;
            let pixel = {
                r: id.data[index],
                g: id.data[index + 1],
                b: id.data[index + 2],
                a: id.data[index + 3],
            }

            column.push(pixel);
        }

        result.push(column);
    }

    return result;
}

function averageImage() {
    if (!cameraAccess) return;
    const imageData = capture("bg");

    let r = 0n;
    let g = 0n;
    let b = 0n;
    let a = 0n;

    for (let i = 0; i < imageData.data.length; i += 4) {
        r += BigInt(imageData.data[i]);
        g += BigInt(imageData.data[i + 1]);
        b += BigInt(imageData.data[i + 2]);
        a += BigInt(imageData.data[i + 3]);
    }

    let pixelCount = imageData.data.length / 4;

    r /= BigInt(pixelCount);
    g /= BigInt(pixelCount);
    b /= BigInt(pixelCount);
    a /= BigInt(pixelCount);

    return `rgb(${r}, ${g}, ${b}, ${a})`;
}

function initWebcam() {
    navigator.mediaDevices.getUserMedia({video: true}).then((mediaStream) => {
        video.srcObject = mediaStream;
        cameraAccess = true;
    }).catch((error) => {
        console.error("Couldn't access webcam: ", error);
        cameraAccess = false;
    });
}

function capture(src) {
    vidCanvas.width = video.videoWidth / 2;
    vidCanvas.height = video.videoHeight / 2;

    if (manualPause) {
        vidCtx.drawImage(storeCanvas, 0, 0, vidCanvas.width, vidCanvas.height);
    } else if (basePlay && src === "base" || bgPlay && src === "bg") {
        vidCtx.drawImage(video, 0, 0, vidCanvas.width, vidCanvas.height);

        storeCanvas.width = vidCanvas.width;
        storeCanvas.height = vidCanvas.height;

        storeCtx.drawImage(vidCanvas, 0, 0);
    } else {
        vidCtx.clearRect(0, 0, vidCanvas.width, vidCanvas.height);
    }

    const now = new Date();
    vidCtx.fillStyle = textColor;
    vidCtx.textAlign = "center";
    vidCtx.textBaseline = "middle";
    vidCtx.font = `bold ${vidCanvas.height / 2}px QuickSand`;

    let timeText;
    if (textType === "time") {
        timeText = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    } else if (textType === "text") {
        timeText = customText;
    } else if (textType === "notext") {
        timeText = ` `;
    }

    const textX = vidCanvas.width / 2;
    const textY = vidCanvas.height / 2;

    vidCtx.fillText(timeText, Math.round(textX), Math.round(textY), vidCanvas.width);

    return vidCtx.getImageData(0, 0, vidCanvas.width, vidCanvas.height);
}

function apply() {
    let bgColor = document.getElementById("bgcolor").value;
    let baseColor = document.getElementById("basecolor").value;

    customText = document.getElementById("text-box").value;
    textType = document.querySelector("input[name='texttype']:checked").value;
    textColor = document.getElementById("textcolor").value;
    timeout = 18 / 10000 * Math.pow(document.getElementById("speed").value, 3) + 20;

    cellCountX = document.getElementById("x").value;
    cellCountY = document.getElementById("y").value;

    window.dispatchEvent(new CustomEvent("resize")); // redo the tiles

    clearInterval(drawLoop);
    drawLoop = setInterval(draw, timeout);

    if (document.getElementById("do-bgcolor").checked) {
        bgPlay = false;
        colors[colors.length - 1] = bgColor;
    }

    if (document.getElementById("do-basecolor").checked) {
        basePlay = false;
        let r, g, b;
        customBaseColor.length = 0;
        for (let i = 0; i < colors.length; i++) {
            customBaseColor.push([]);
            for (let j = 0; j < colors[i].length; j++) {
                r = parseInt(baseColor.substring(1, 3), 16) + Math.random() * (maxColorOffset / 2) - maxColorOffset / 2;
                g = parseInt(baseColor.substring(3, 5), 16) + Math.random() * (maxColorOffset / 2) - maxColorOffset / 2;
                b = parseInt(baseColor.substring(5, 7), 16) + Math.random() * (maxColorOffset / 2) - maxColorOffset / 2;

                r = clamp(0, 255, r);
                g = clamp(0, 255, g);
                b = clamp(0, 255, b);

                customBaseColor[i].push(`rgb(${clamp(0, 255, Math.round(r))}, ${clamp(0, 255, Math.round(g))}, ${clamp(0, 255, Math.round(b))})`);
            }
        }
    }
}

function clamp(min, max, a) {
    return Math.min(Math.max(a, min), max);
}

document.addEventListener("DOMContentLoaded", function () {
    let textBox = document.getElementById("display-text-box");
    let textRadio = document.getElementById("text");
    canvas = document.getElementById("canv");
    ctx = canvas.getContext("2d");
    storeCanvas = document.getElementById("store-canvas");
    storeCtx = storeCanvas.getContext("2d");

    document.querySelectorAll("input[type='radio']").forEach((r) => r.addEventListener("change", (e) => {
        textBox.hidden = textRadio !== e.target;
    }));

    window.addEventListener("resize", () => {
        if (window.devicePixelRatio >= 1) {
            canvas.height = window.innerHeight * window.devicePixelRatio;
            canvas.width = window.innerWidth * window.devicePixelRatio;
        } else {
            canvas.width = document.body.clientWidth;
            canvas.height = document.body.clientHeight;
        }

        positions.length = 0;
        colors.length = 0;
        for (let i = 0; i < cellCountX; i++) {
            positions.push([]);
            colors.push([]);
            for (let j = 0; j < cellCountY; j++) {
                positions[i].push({
                    pos: Math.round(Math.random() * 180),
                    timeStep: Math.random() * timeScale, // TODO: Clamp to min
                });
                colors[i].push("#000000");
            }
        }
        colors.push("#000000"); // Background
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            averageImage();
        }

        if (e.key === " ") {
            if (!bgPlay || !basePlay || manualPause) {
                bgPlay = true;
                basePlay = true;
                manualPause = false;
            } else if (bgPlay && basePlay && !manualPause) {
                manualPause = true;
            } else {
                bgPlay = false;
                basePlay = false;
                manualPause = false;
                customBaseColor.length = 0;
                customBgColor = "#00000000";
            }
        }

        if (e.key === "Shift") {
            baseInfluence = !baseInfluence;
        }

        if (e.key === "Escape") {
            document.getElementById("menu").hidden = true;
        }
    });

    canvas.addEventListener("click", () => {
        document.getElementById("menu").hidden = false;
    });

    document.getElementById("close").addEventListener("click", () => {
        document.getElementById("menu").hidden = true;
    });

    document.getElementById("apply").addEventListener("click", (e) => {
        e.preventDefault();
        apply();
        document.getElementById("menu").hidden = true;
    });

    video = document.getElementById("webcam");
    vidCanvas = document.getElementById("vid-canvas");
    vidCtx = vidCanvas.getContext("2d", {willReadFrequently: true});

    initWebcam();
    window.dispatchEvent(new Event("resize"));
    drawLoop = setInterval(draw, timeout);
});