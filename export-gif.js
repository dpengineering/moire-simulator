// GIF export for the rotating discs.
// Renders one full moiré period to an offscreen canvas and encodes it as a
// seamlessly-looping GIF using the vendored gifenc encoder.
import { GIFEncoder, quantize, applyPalette } from "./gifenc.js";

const SIZE = 400; // output dimensions (square)
const TARGET_FPS = 20; // preferred frame rate
const MAX_FRAMES = 200; // cap so long periods don't produce huge files
const MAX_PERIOD = 60; // seconds; refuse to render anything longer

// --- period math -----------------------------------------------------------

// Greatest common divisor / least common multiple on values rounded to 0.1s,
// so decimal speeds still yield an exact loop length.
function gcd(a, b) {
    while (b) [a, b] = [b, a % b];
    return a;
}

// Least common multiple of two rotation periods (seconds). A period of 0 means
// that disc isn't rotating and contributes nothing.
function loopPeriod(t1, t2) {
    const active = [t1, t2].filter((t) => t > 0);
    if (active.length === 0) return 0; // nothing moves
    if (active.length === 1) return active[0];
    // Work in tenths of a second as integers to handle decimals robustly.
    const a = Math.round(active[0] * 10);
    const b = Math.round(active[1] * 10);
    return (a / gcd(a, b)) * b / 10;
}

// --- rendering --------------------------------------------------------------

function drawDisc(ctx, img, angleDeg, flipX) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const inset = SIZE * 0.98;
    const off = (SIZE - inset) / 2;
    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate((angleDeg * Math.PI) / 180);
    if (flipX) ctx.scale(-1, 1);
    // images are stretched to fill the square container in the live app
    ctx.drawImage(img, -inset / 2, -inset / 2, inset, inset);
    ctx.restore();
    void off;
}

function renderFrame(ctx, opts, t) {
    const { img1, img2, t1, t2, dir1, dir2, flip2, bg } = opts;
    const a1 = t1 > 0 ? dir1 * 360 * (t / t1) : 0;
    const a2 = t2 > 0 ? dir2 * 360 * (t / t2) : 0;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Both layers use multiply against the backdrop, matching the CSS.
    ctx.globalCompositeOperation = "multiply";
    drawDisc(ctx, img1, a1, false);
    drawDisc(ctx, img2, a2, flip2);
    ctx.globalCompositeOperation = "source-over";
}

// --- settings snapshot ------------------------------------------------------

function readSettings() {
    const speed1 = parseFloat(document.getElementById("speed1").value) || 0;
    const speed2 = parseFloat(document.getElementById("speed2").value) || 0;
    const dir1 = document.getElementById("direction1").checked ? -1 : 1;
    const dir2 = document.getElementById("direction2").checked ? -1 : 1;
    const flip2 = document.getElementById("flipped").checked;
    const img1 = document.getElementById("image1");
    const img2 = document.getElementById("image2");
    const bg = getComputedStyle(
        document.getElementById("imageContainer"),
    ).backgroundColor;
    return { speed1, speed2, dir1, dir2, flip2, img1, img2, bg };
}

// --- main -------------------------------------------------------------------

async function exportGif(button) {
    const s = readSettings();

    // Fall back to the app's default running speed if both discs are stopped
    // (e.g. the user hasn't pressed Start yet).
    let { speed1, speed2 } = s;
    if (speed1 === 0 && speed2 === 0) {
        speed1 = 5;
        speed2 = 5;
    }

    let period = loopPeriod(speed1, speed2);
    if (period <= 0) {
        alert("Set a rotation speed on at least one disc before exporting.");
        return;
    }
    if (period > MAX_PERIOD) {
        alert(
            `These speeds repeat only after ${period.toFixed(
                1,
            )}s, which is too long to export. Try closer speeds (e.g. both the same, or 4 & 6) for a shorter loop.`,
        );
        return;
    }

    // Keep the loop exactly one period; drop the frame rate if needed to stay
    // under the frame cap, so the GIF always loops seamlessly.
    let fps = TARGET_FPS;
    let frames = Math.round(period * fps);
    if (frames > MAX_FRAMES) {
        frames = MAX_FRAMES;
        fps = frames / period;
    }
    if (frames < 2) frames = 2;
    // gifenc expects the frame delay in milliseconds (it converts to the GIF's
    // centisecond units internally). Floor at 20ms so playback isn't clamped.
    const delay = Math.max(20, Math.round(1000 / fps));

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const opts = {
        img1: s.img1,
        img2: s.img2,
        t1: speed1,
        t2: speed2,
        dir1: s.dir1,
        dir2: s.dir2,
        flip2: s.flip2,
        bg: s.bg,
    };

    const originalLabel = button.textContent;
    button.disabled = true;

    try {
        const gif = GIFEncoder();
        for (let i = 0; i < frames; i++) {
            const t = (i / frames) * period;
            renderFrame(ctx, opts, t);
            const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
            const palette = quantize(data, 256);
            const index = applyPalette(data, palette);
            gif.writeFrame(index, SIZE, SIZE, { palette, delay });
            button.textContent = `Rendering ${Math.round(
                ((i + 1) / frames) * 100,
            )}%`;
            // Yield so the progress label repaints and the tab stays responsive.
            await new Promise((r) => setTimeout(r, 0));
        }
        gif.finish();

        const blob = new Blob([gif.bytes()], { type: "image/gif" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "moire.gif";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
        console.error(err);
        alert("Sorry, the GIF export failed. See the console for details.");
    } finally {
        button.textContent = originalLabel;
        button.disabled = false;
    }
}

const exportButton = document.getElementById("exportGif");
if (exportButton) {
    exportButton.addEventListener("click", () => exportGif(exportButton));
}
