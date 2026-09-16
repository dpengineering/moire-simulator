const CACHE_VERSION = "3";
const CACHE_KEY = "moire-design-rotator-cache-version";

function forceCacheRefresh() {
    try {
        const storedVersion = window.localStorage.getItem(CACHE_KEY);
        const currentUrl = new URL(window.location.href);
        const versionParam = currentUrl.searchParams.get("v");

        if (storedVersion !== CACHE_VERSION || versionParam !== CACHE_VERSION) {
            window.localStorage.setItem(CACHE_KEY, CACHE_VERSION);
            currentUrl.searchParams.set("v", CACHE_VERSION);
            window.location.replace(currentUrl.toString());
            return true;
        }
    } catch (error) {
        // If storage or URL rewriting is unavailable, continue normally.
    }

    return false;
}

forceCacheRefresh();

const imageContainer = document.getElementById("imageContainer");
const image1 = document.getElementById("image1");
const image2 = document.getElementById("image2");
const inputImage1 = document.getElementById("inputImage1");
const inputImage2 = document.getElementById("inputImage2");
const inputImage2Text = document.getElementById("inputImage2Text");
const speed1Input = document.getElementById("speed1");
const direction1CheckBox = document.getElementById("direction1");
const speed2Input = document.getElementById("speed2");
const direction2CheckBox = document.getElementById("direction2");
const pauseRotationButton = document.getElementById("pauseRotation");
const resetRotationButton = document.getElementById("resetRotation");
const sameDesignCheckBox = document.getElementById("sameDesign");
const sameDesignText = document.getElementById("sameDesignText");
const flipDesignCheckBox = document.getElementById("flipped");
const flipDesignText = document.getElementById("flippedText");

const colorInput = document.getElementById("color");
const bgColor = document.getElementById("bgColor");
const animColorControls = document.getElementById("animColorControls");
const animColorList = document.getElementById("animColorList");
const addAnimColor = document.getElementById("addAnimColor");
const removeAnimColor = document.getElementById("removeAnimColor");
const animColorButton = document.getElementById("animColorButton");
const bgAnimSpeed = document.getElementById("bgAnimSpeed");
const bgAnimSpeedLabel = document.getElementById("bgAnimSpeedLabel");

const root = document.querySelector(":root");
const variables = getComputedStyle(root);

let isPaused = true;
let bgAnimPaused = true;
let initialSpeed1 = parseFloat(speed1Input.value);
// initialize visibility of speed control and its label based on current background mode
if (bgAnimSpeed && colorInput) {
    const show = colorInput.value === "animColor";
    bgAnimSpeed.style.display = show ? "inline-block" : "none";
    if (bgAnimSpeedLabel)
        bgAnimSpeedLabel.style.display = show ? "inline-block" : "none";
}
let initialSpeed2 = parseFloat(speed2Input.value);

inputImage1.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        const imageUrl = URL.createObjectURL(file);
        image1.src = imageUrl;
    }
});

inputImage2.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        const imageUrl = URL.createObjectURL(file);
        image2.src = imageUrl;
    }
});

colorInput.addEventListener("change", (event) => {
    if (event.target.value === "animColor") {
        animColorControls.style.display = "flex";
        bgColor.style.display = "none";

        // ensure at least 2 pickers exist
        if (animColorList.querySelectorAll(".anim-color").length === 0) {
            addColorPicker("#33CCCC");
            addColorPicker("#33CC36");
            addColorPicker("#B8CC33");
        }

        imageContainer.style.transitionDuration = "0.75s";
        if (bgAnimSpeed) bgAnimSpeed.style.display = "inline-block";
        if (bgAnimSpeedLabel) bgAnimSpeedLabel.style.display = "inline-block";
    } else {
        animColorControls.style.display = "none";
        bgColor.style.display = "inline-block";
        bgAnimPaused = true;

        imageContainer.style.transitionDuration = "0s";
        imageContainer.style.backgroundColor = bgColor.value;
        if (bgAnimSpeed) bgAnimSpeed.style.display = "none";
        if (bgAnimSpeedLabel) bgAnimSpeedLabel.style.display = "none";
        animColorButton.textContent = "Resume Anim";
    }
});

animColorButton.addEventListener("click", () => {
    if (bgAnimPaused === true) {
        // collect colors from pickers
        const pickers = Array.from(
            animColorList.querySelectorAll(".anim-color"),
        );
        const colors = pickers.map((p) => p.value).filter(Boolean);
        if (colors.length === 0) return; // nothing to animate
        bgAnimPaused = false;
        animateBackgroundColor(colors);
        animColorButton.textContent = "Stop Anim";
    } else {
        bgAnimPaused = true;
        imageContainer.style.backgroundColor = bgColor.value;
        animColorButton.textContent = "Resume Anim";
    }
});

addAnimColor.addEventListener("click", () => addColorPicker("#ffffff"));
removeAnimColor.addEventListener("click", () => {
    const pickers = animColorList.querySelectorAll(".anim-color");
    if (pickers.length > 0)
        animColorList.removeChild(pickers[pickers.length - 1]);
});

function addColorPicker(initial = "#ffffff") {
    const input = document.createElement("input");
    input.type = "color";
    input.value = initial;
    input.className = "anim-color";
    input.style.width = "40px";
    input.style.height = "36px";
    input.style.border = "none";
    input.style.padding = "0";
    input.style.background = "transparent";
    animColorList.appendChild(input);
    return input;
}

bgColor.addEventListener("input", () => {
    imageContainer.style.backgroundColor = bgColor.value;
});

speed1Input.addEventListener("input", () => {
    if (!isPaused) {
        updateImageRotation(image1, speed1Input, direction1CheckBox);
    }
});

direction1CheckBox.addEventListener("click", () => {
    updateImageRotation(image1, speed1Input, direction1CheckBox);
});

speed2Input.addEventListener("input", () => {
    if (!isPaused) {
        updateImageRotation(image2, speed2Input, direction2CheckBox);
    }
});

direction2CheckBox.addEventListener("click", () => {
    updateImageRotation(image2, speed2Input, direction2CheckBox);
});

pauseRotationButton.addEventListener("click", () => {
    if (pauseRotationButton.textContent === "Start") {
        // Starting rotation from initial paused state
        speed1Input.value = 5;
        speed2Input.value = 5;
        isPaused = false;
        pauseRotationButton.textContent = "Pause Rotation";
        resetAnimation();
        updateImageRotation(image1, speed1Input, direction1CheckBox);
        updateImageRotation(image2, speed2Input, direction2CheckBox);
    } else {
        // Toggling between pause and resume
        isPaused = !isPaused;
        if (isPaused) {
            pauseRotationButton.textContent = "Resume Rotation";
            pauseRotation();
        } else {
            pauseRotationButton.textContent = "Pause Rotation";
            resumeRotation();
        }
    }
    resetAnimation();
});

resetRotationButton.addEventListener("click", () => {
    resetAnimation();
});

// Remembers the user's own Image #2 while "Same Design" borrows Image #1's,
// so unchecking restores it instead of discarding it.
let savedImage2Src = null;

sameDesignCheckBox.addEventListener("click", (event) => {
    if (event.target.checked) {
        flipDesignCheckBox.style.display = "inline-grid";
        flipDesignText.style.display = "inline-block";
        savedImage2Src = image2.src;
        image2.src = image1.src;
    } else {
        flipDesignCheckBox.style.display = "none";
        flipDesignText.style.display = "none";
        // The flip only applies to the borrowed design; clear it so the
        // restored Image #2 isn't left mirrored.
        flipDesignCheckBox.checked = false;
        image2.style.scale = "1 1";
        image2.src = savedImage2Src || "DPEA_Logo.png?v=3";
        inputImage2Text.style.display = "none";
        inputImage2.style.display = "inline-block";
    }
});

flipDesignCheckBox.addEventListener("click", (event) => {
    if (event.target.checked) {
        image2.style.scale = "-1 1";
    } else {
        image2.style.scale = "1 1";
    }
});

function load() {
    pauseRotation();
    pauseRotationButton.textContent = "Start";
}

function updateImageRotation(image, speedInput, directionSelect) {
    const speed = parseFloat(speedInput.value);
    const direction = directionSelect.checked === false ? "normal" : "reverse";
    image.style.setProperty("--rotation-speed", `${speed}s`);
    image.style.setProperty("--rotation-direction", direction);
    // Control animation play state
    image.style.animationPlayState = isPaused ? "paused" : "running";
}

function pauseRotation() {
    initialSpeed1 = parseFloat(speed1Input.value);
    initialSpeed2 = parseFloat(speed2Input.value);
    speed1Input.value = "0";
    speed2Input.value = "0";
    updateImageRotation(image1, speed1Input, direction1CheckBox);
    updateImageRotation(image2, speed2Input, direction2CheckBox);
}

function resumeRotation() {
    if (parseFloat(speed1Input.value) == 0) speed1Input.value = initialSpeed1;
    if (parseFloat(speed2Input.value) == 0) speed2Input.value = initialSpeed2;
    updateImageRotation(image1, speed1Input, direction1CheckBox);
    updateImageRotation(image2, speed2Input, direction2CheckBox);
}

function resetAnimation() {
    let image1 = document.querySelector("#image1");
    let image2 = document.querySelector("#image2");

    image1.style.animationName = "none";
    image2.style.animationName = "none";

    requestAnimationFrame(() => {
        setTimeout(() => {
            image1.style.animationName = "";
        }, 0);
    });
    requestAnimationFrame(() => {
        setTimeout(() => {
            image2.style.animationName = "";
        }, 0);
    });
}

function animateBackgroundColor(colors) {
    let currentIndex = 0;

    function changeColor() {
        if (colors.length > 0 && bgAnimPaused !== true) {
            imageContainer.style.backgroundColor = colors[currentIndex];
            currentIndex = (currentIndex + 1) % colors.length;
            // read speed (seconds) from control, default to 1s
            let interval = 1000;
            try {
                const v = parseFloat(bgAnimSpeed && bgAnimSpeed.value);
                if (!isNaN(v) && v > 0) interval = Math.max(50, v * 1000);
            } catch (e) {
                interval = 1000;
            }
            setTimeout(changeColor, interval);
        }
    }

    changeColor();
}

setInterval(function () {
    if (sameDesignCheckBox.checked) {
        inputImage2.style.display = "none";
        inputImage2Text.style.display = "inline-block";
        image2.src = image1.src;
        if (flipDesignCheckBox.checked) {
            image2.style.scale = "-1 1";
        }
    }
}, 400);
