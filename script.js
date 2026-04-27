const imageInput = document.getElementById("imageInput");
const previewWrap = document.getElementById("previewWrap");
const preview = document.getElementById("preview");
const compressBtn = document.getElementById("compressBtn");
const result = document.getElementById("result");
const fileInfo = document.getElementById("fileInfo");
const dimensionInfo = document.getElementById("dimensionInfo");
const downloadBtn = document.getElementById("downloadBtn");
const toast = document.getElementById("toast");

let originalImage = null;
let originalFileName = "compressed-photo";

function showToast(message = "Done") {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1400);
}

function bytesToKB(bytes) {
  return Math.round(bytes / 1024);
}

function extensionFromMime(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = reject;
    img.src = url;
  });
}

imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];
  if (!file) return;

  originalFileName = file.name.replace(/\.[^/.]+$/, "") || "compressed-photo";
  originalImage = await loadImage(file);

  preview.src = URL.createObjectURL(file);
  previewWrap.classList.remove("hidden");
  compressBtn.disabled = false;
  result.classList.add("hidden");
});

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    const preset = button.dataset.preset;

    if (preset === "passport") {
      document.getElementById("format").value = "image/jpeg";
      document.getElementById("targetSize").value = 200;
      document.getElementById("width").value = 600;
      document.getElementById("height").value = 600;
      document.getElementById("fitMode").value = "cover";
      document.getElementById("background").value = "#ffffff";
    }

    if (preset === "small") {
      document.getElementById("format").value = "image/jpeg";
      document.getElementById("targetSize").value = 100;
      document.getElementById("width").value = "";
      document.getElementById("height").value = "";
      document.getElementById("fitMode").value = "contain";
      document.getElementById("background").value = "#ffffff";
    }

    if (preset === "medium") {
      document.getElementById("format").value = "image/jpeg";
      document.getElementById("targetSize").value = 200;
      document.getElementById("width").value = "";
      document.getElementById("height").value = "";
      document.getElementById("fitMode").value = "contain";
      document.getElementById("background").value = "#ffffff";
    }

    if (preset === "profile") {
      document.getElementById("format").value = "image/jpeg";
      document.getElementById("targetSize").value = 500;
      document.getElementById("width").value = 800;
      document.getElementById("height").value = 800;
      document.getElementById("fitMode").value = "cover";
      document.getElementById("background").value = "#ffffff";
    }

    showToast("Preset applied");
  });
});

function drawToCanvas(img, widthInput, heightInput, fitMode, bg) {
  let outputWidth = widthInput || img.naturalWidth;
  let outputHeight = heightInput || img.naturalHeight;

  if (widthInput && !heightInput) {
    outputHeight = Math.round((img.naturalHeight / img.naturalWidth) * outputWidth);
  }

  if (!widthInput && heightInput) {
    outputWidth = Math.round((img.naturalWidth / img.naturalHeight) * outputHeight);
  }

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");

  if (bg !== "transparent") {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, outputWidth, outputHeight);
  }

  const sourceRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = outputWidth / outputHeight;

  let drawWidth;
  let drawHeight;
  let dx;
  let dy;

  if (fitMode === "cover") {
    if (sourceRatio > targetRatio) {
      drawHeight = outputHeight;
      drawWidth = outputHeight * sourceRatio;
    } else {
      drawWidth = outputWidth;
      drawHeight = outputWidth / sourceRatio;
    }
    dx = (outputWidth - drawWidth) / 2;
    dy = (outputHeight - drawHeight) / 2;
  } else {
    if (sourceRatio > targetRatio) {
      drawWidth = outputWidth;
      drawHeight = outputWidth / sourceRatio;
    } else {
      drawHeight = outputHeight;
      drawWidth = outputHeight * sourceRatio;
    }
    dx = (outputWidth - drawWidth) / 2;
    dy = (outputHeight - drawHeight) / 2;
  }

  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  return canvas;
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mime, quality);
  });
}

async function compressCanvas(canvas, mime, targetKB) {
  if (mime === "image/png") {
    return await canvasToBlob(canvas, mime);
  }

  let low = 0.1;
  let high = 0.95;
  let bestBlob = await canvasToBlob(canvas, mime, high);

  for (let i = 0; i < 10; i++) {
    const mid = (low + high) / 2;
    const blob = await canvasToBlob(canvas, mime, mid);

    if (bytesToKB(blob.size) <= targetKB) {
      bestBlob = blob;
      low = mid;
    } else {
      high = mid;
    }
  }

  return bestBlob;
}

compressBtn.addEventListener("click", async () => {
  if (!originalImage) return;

  compressBtn.disabled = true;
  compressBtn.textContent = "Compressing...";

  const format = document.getElementById("format").value;
  const targetKB = Number(document.getElementById("targetSize").value);
  const widthInput = Number(document.getElementById("width").value) || null;
  const heightInput = Number(document.getElementById("height").value) || null;
  const fitMode = document.getElementById("fitMode").value;
  const bg = document.getElementById("background").value;

  const canvas = drawToCanvas(originalImage, widthInput, heightInput, fitMode, bg);
  const blob = await compressCanvas(canvas, format, targetKB);

  const url = URL.createObjectURL(blob);
  const ext = extensionFromMime(format);

  downloadBtn.href = url;
  downloadBtn.download = `${originalFileName}-compressed.${ext}`;

  fileInfo.textContent = `${bytesToKB(blob.size)} KB`;
  dimensionInfo.textContent = `${canvas.width} × ${canvas.height}px • ${format.replace("image/", "").toUpperCase()}`;

  result.classList.remove("hidden");

  compressBtn.disabled = false;
  compressBtn.textContent = "Compress photo";
});
