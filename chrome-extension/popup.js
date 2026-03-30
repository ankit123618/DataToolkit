// Start with base speeds
let upload = 10.42;
let download = 56.78;

// Generates small fluctuations like real network speeds
function fluctuate(base) {
  const delta = (Math.random() * 1 - 0.5); // ±0.5
  return Math.max(0, base + delta);
}

// Updates speeds every 5 seconds
function updateSpeeds() {
  upload = fluctuate(upload);
  download = fluctuate(download);

  document.getElementById("upload").textContent = upload.toFixed(2);
  document.getElementById("download").textContent = download.toFixed(2);
}

// Calculator logic
function calculate() {
  const size = parseFloat(document.getElementById("fileSize").value);
  const type = document.getElementById("transferType").value;

  if (isNaN(size) || size <= 0) {
    alert("Enter a valid file size.");
    return;
  }

  const speed = type === "upload" ? upload : download;

  const speed_MBps = speed / 8;
  const time_sec = size / speed_MBps;

  const mins = Math.floor(time_sec / 60);
  const secs = Math.round(time_sec % 60);

  const overhead = size * 0.05;
  const totalData = size + overhead;

  document.getElementById("time").textContent =
    `${mins} min ${secs} sec`;

  document.getElementById("data").textContent =
    totalData.toFixed(2);
}

// Bind the button click
document.getElementById("calcBtn").addEventListener("click", calculate);

// Start updating speeds
updateSpeeds();
setInterval(updateSpeeds, 5000);
