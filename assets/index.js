let canvas;
let cellScale = 6;
let ctx;
let video;
let vidCanvas;
let vidCtx;
let cellCountX = 5 * cellScale;
let cellCountY = 3 * cellScale;
let timeScale = 0.3;
let magCap = 2 / 60; // MUST BE A RATIO TO STAY SANE
let maxColorOffset = 100; // both directions i.e. 50 results in ±25
let cameraAccess = false;
let play = true;
let baseInfluence = true;

// Array of [position, step]
const positions = [];
const colors = [];

function draw() {
    if (play) {
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
    const imageData = imageDataTo2dArray(capture());
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

    let r, g, b;
    for (let i = 0; i < cellCountX; i++) {
        for (let j = 0; j < cellCountY; j++) {
            if (play) {
                r = 0;
                g = 0;
                b = 0;

                let vidCellWidth = Math.floor(vidCanvas.width / cellCountX);
                let vidCellHeight = Math.floor(vidCanvas.height / cellCountY);
                for (let x = 0; x < vidCellWidth; x++) {
                    for (let y = 0; y < vidCellHeight; y++) {
                        r += imageData[x + vidCellWidth * i][y + vidCellHeight * j].r;
                        g += imageData[x + vidCellWidth * i][y + vidCellHeight * j].g;
                        b += imageData[x + vidCellWidth * i][y + vidCellHeight * j].b;
                    }
                }

                r /= vidCellWidth * vidCellHeight;
                g /= vidCellWidth * vidCellHeight;
                b /= vidCellWidth * vidCellHeight;

                ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
                colors[i][j] = ctx.fillStyle;
            } else {
                ctx.fillStyle = colors[i][j];
            }

            let influence = magCap * Math.sin(positions[i][j].pos);
            ctx.fillRect(i * cellWidth + offsetX + cellWidth * (influence * baseInfluence), j * cellHeight + offsetY + cellHeight * (influence * baseInfluence), cellWidth - cellWidth * (influence * baseInfluence) * 2, cellHeight - cellHeight * (influence * baseInfluence) * 2);

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
                a: 1,
            }

            column.push(pixel);
        }

        result.push(column);
    }

    return result;
}

function averageImage() {
    if (!cameraAccess) return;
    const imageData = capture();

    let r = 0n;
    let g = 0n;
    let b = 0n;

    for (let i = 0; i < imageData.data.length; i += 4) {
        r += BigInt(imageData.data[i]);
        g += BigInt(imageData.data[i + 1]);
        b += BigInt(imageData.data[i + 2]);
    }

    let pixelCount = imageData.data.length / 4;

    r /= BigInt(pixelCount);
    g /= BigInt(pixelCount);
    b /= BigInt(pixelCount);

    return `rgb(${r}, ${g}, ${b}, 1)`;
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

function capture() {
    vidCanvas.width = video.videoWidth / 2;
    vidCanvas.height = video.videoHeight / 2;
    vidCtx.drawImage(video, 0, 0, vidCanvas.width, vidCanvas.height);
    return vidCtx.getImageData(0, 0, vidCanvas.width, vidCanvas.height);
}

function apply() {
    let textColor = document.getElementById("textcolor").value;
    let bgColor = document.getElementById("bgcolor").value;
    let baseColor = document.getElementById("basecolor").value;
    let text = document.getElementById("text-box").value;
    let selectedText = document.querySelector("input[name='texttype']:checked").value;

    if (true /* TODO: replace with the output of a tickbox for static background */) {
        play = false;
        colors[colors.length - 1] = bgColor;

        let r, g, b;
        for (let i = 0; i < colors.length; i++) {
            for (let j = 0; j < colors[i].length; j++) {
                r = parseInt(baseColor.substring(1, 3), 16) + Math.random() * (maxColorOffset / 2) - maxColorOffset / 2;
                g = parseInt(baseColor.substring(3, 5), 16) + Math.random() * (maxColorOffset / 2) - maxColorOffset / 2;
                b = parseInt(baseColor.substring(5, 7), 16) + Math.random() * (maxColorOffset / 2) - maxColorOffset / 2;

                r = clamp(0, 255, r);
                g = clamp(0, 255, g);
                b = clamp(0, 255, b);

                colors[i][j] = `rgb(${r}, ${g}, ${b})`;
            }
        }
    }
}

function clamp(min, max, a) {
    return Math.min(Math.max(a, min), max);
}

document.addEventListener("DOMContentLoaded", function () {
    let textBox = document.getElementById("display-text-box");
    let textColor = document.getElementById("display-text-color");
    let textRadio = document.getElementById("text");

    document.querySelectorAll("input[type='radio']").forEach((r) => r.addEventListener("change", (e) => {
        if (textRadio === e.target) {
            textBox.hidden = false;
            textColor.hidden = false;
        } else {
            textBox.hidden = true;
            textColor.hidden = true;
        }
    }));

    canvas = document.getElementById("canv");
    ctx = canvas.getContext("2d");

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
                    pos: Math.round(Math.random() * 360),
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
            play = !play;
        }

        if (e.key === "Shift") {
            baseInfluence = !baseInfluence;
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
    setInterval(draw, 100);
});