const canvas = document.querySelector("#planeCanvas");
const ctx = canvas.getContext("2d");

const elements = {
  status: document.querySelector("#statusMessage"),
  shapePreset: document.querySelector("#shapePreset"),
  pointForm: document.querySelector("#pointForm"),
  pointX: document.querySelector("#pointX"),
  pointY: document.querySelector("#pointY"),
  pointsTable: document.querySelector("#pointsTable"),
  transformedTable: document.querySelector("#transformedTable"),
  applyButton: document.querySelector("#applyButton"),
  resetMatrixButton: document.querySelector("#resetMatrixButton"),
  clearShapeButton: document.querySelector("#clearShapeButton"),
  zoomInButton: document.querySelector("#zoomInButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  fitButton: document.querySelector("#fitButton"),
  matrix: {
    a: document.querySelector("#matrixA"),
    b: document.querySelector("#matrixB"),
    c: document.querySelector("#matrixC"),
    d: document.querySelector("#matrixD"),
  },
};

const css = getComputedStyle(document.documentElement);
const colors = {
  grid: css.getPropertyValue("--grid").trim(),
  axis: css.getPropertyValue("--axis").trim(),
  original: css.getPropertyValue("--original").trim(),
  originalFill: css.getPropertyValue("--original-fill").trim(),
  transformed: css.getPropertyValue("--transformed").trim(),
  transformedFill: css.getPropertyValue("--transformed-fill").trim(),
  point: css.getPropertyValue("--point").trim(),
  muted: css.getPropertyValue("--muted").trim(),
};

const shapePresets = {
  square: [
    [-2, -2],
    [2, -2],
    [2, 2],
    [-2, 2],
  ],
  rectangle: [
    [-3, -1.5],
    [3, -1.5],
    [3, 1.5],
    [-3, 1.5],
  ],
  triangle: [
    [0, 3],
    [-2.6, -1.5],
    [2.6, -1.5],
  ],
  pentagon: regularPolygon(5, 2.5, Math.PI / 2),
};

const matrixPresets = {
  identity: [1, 0, 0, 1],
  rotate90: [0, -1, 1, 0],
  rotate180: [-1, 0, 0, -1],
  rotate270: [0, 1, -1, 0],
  flipH: [-1, 0, 0, 1],
  flipV: [1, 0, 0, -1],
  scaleUp: [1.5, 0, 0, 1.5],
  scaleDown: [0.5, 0, 0, 0.5],
  shearX: [1, 1, 0, 1],
  shearY: [1, 0, 1, 1],
};

let points = [];
let transformedPoints = [];
let matrix = [1, 0, 0, 1];
let view = {
  scale: 56,
  offsetX: 0,
  offsetY: 0,
};
let isPanning = false;
let lastPointer = null;

function regularPolygon(sides, radius, startAngle) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = startAngle + (index * Math.PI * 2) / sides;
    return [Number((Math.cos(angle) * radius).toFixed(3)), Number((Math.sin(angle) * radius).toFixed(3))];
  });
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.style.color = isError ? "#b42318" : "";
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "";
  return Number.parseFloat(value.toFixed(3)).toString();
}

function parseNumericInput(value) {
  const normalized = value.trim().replace("−", "-");
  if (normalized === "") return Number.NaN;
  return Number(normalized);
}

function getMatrixFromInputs() {
  const nextMatrix = [
    parseNumericInput(elements.matrix.a.value),
    parseNumericInput(elements.matrix.b.value),
    parseNumericInput(elements.matrix.c.value),
    parseNumericInput(elements.matrix.d.value),
  ];

  if (nextMatrix.some((value) => !Number.isFinite(value))) {
    setStatus("Enter valid numeric values for all four matrix cells.", true);
    return null;
  }

  return nextMatrix;
}

function writeMatrix(values) {
  [elements.matrix.a.value, elements.matrix.b.value, elements.matrix.c.value, elements.matrix.d.value] =
    values.map(formatNumber);
}

function applyTransformation({ updateStatus = true } = {}) {
  const nextMatrix = getMatrixFromInputs();
  if (!nextMatrix) {
    render();
    return;
  }

  matrix = nextMatrix;
  const [a, b, c, d] = matrix;

  // Matrix multiplication for a column vector [x, y]:
  // [a b] [x] = [ax + by]
  // [c d] [y]   [cx + dy]
  transformedPoints = points.map(([x, y]) => [a * x + b * y, c * x + d * y]);

  if (updateStatus) {
    setStatus(`Applied matrix [${formatNumber(a)} ${formatNumber(b)}; ${formatNumber(c)} ${formatNumber(d)}].`);
  }

  render();
}

function loadShape(name) {
  points = shapePresets[name].map(([x, y]) => [x, y]);
  applyTransformation({ updateStatus: false });
  fitToShapes();
  setStatus(`${name.charAt(0).toUpperCase() + name.slice(1)} preset loaded.`);
}

function addPoint(x, y) {
  points.push([x, y]);
  applyTransformation({ updateStatus: false });
  fitToShapes();
  setStatus(`Added point (${formatNumber(x)}, ${formatNumber(y)}).`);
}

function removePoint(index) {
  points.splice(index, 1);
  applyTransformation({ updateStatus: false });
  fitToShapes();
  setStatus("Point removed.");
}

function clearShape() {
  points = [];
  transformedPoints = [];
  elements.shapePreset.value = "";
  render();
  setStatus("Shape cleared. Add at least three points to close a polygon.");
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, Math.round(rect.width * ratio));
  canvas.height = Math.max(320, Math.round(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  render();
}

function canvasSize() {
  const ratio = window.devicePixelRatio || 1;
  return {
    width: canvas.width / ratio,
    height: canvas.height / ratio,
  };
}

function toScreen([x, y]) {
  const { width, height } = canvasSize();
  return {
    x: width / 2 + view.offsetX + x * view.scale,
    y: height / 2 + view.offsetY - y * view.scale,
  };
}

function toWorld(screenX, screenY) {
  const { width, height } = canvasSize();
  return [
    (screenX - width / 2 - view.offsetX) / view.scale,
    -(screenY - height / 2 - view.offsetY) / view.scale,
  ];
}

function fitToShapes() {
  const allPoints = [...points, ...transformedPoints];
  const { width, height } = canvasSize();

  if (!allPoints.length || width === 0 || height === 0) {
    view.scale = 56;
    view.offsetX = 0;
    view.offsetY = 0;
    render();
    return;
  }

  const xs = allPoints.map(([x]) => x);
  const ys = allPoints.map(([, y]) => y);
  const minX = Math.min(...xs, -1);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, -1);
  const maxY = Math.max(...ys, 1);
  const spanX = Math.max(maxX - minX, 2);
  const spanY = Math.max(maxY - minY, 2);
  const padding = 90;

  view.scale = Math.max(18, Math.min((width - padding) / spanX, (height - padding) / spanY, 96));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  view.offsetX = -centerX * view.scale;
  view.offsetY = centerY * view.scale;
  render();
}

function zoomAt(factor, screenPoint) {
  const before = toWorld(screenPoint.x, screenPoint.y);
  view.scale = Math.max(14, Math.min(180, view.scale * factor));
  const after = toScreen(before);
  view.offsetX += screenPoint.x - after.x;
  view.offsetY += screenPoint.y - after.y;
  render();
}

function drawGrid() {
  const { width, height } = canvasSize();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);

  const spacing = gridSpacing();
  const [minX, maxY] = toWorld(0, 0);
  const [maxX, minY] = toWorld(width, height);

  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.grid;
  ctx.fillStyle = colors.muted;
  ctx.font = "12px Inter, system-ui, sans-serif";

  for (let x = Math.floor(minX / spacing) * spacing; x <= maxX; x += spacing) {
    const screen = toScreen([x, 0]);
    ctx.beginPath();
    ctx.moveTo(screen.x, 0);
    ctx.lineTo(screen.x, height);
    ctx.stroke();
    if (Math.abs(x) > spacing / 10) {
      ctx.fillText(formatNumber(x), screen.x + 4, Math.min(height - 8, Math.max(14, toScreen([0, 0]).y + 16)));
    }
  }

  for (let y = Math.floor(minY / spacing) * spacing; y <= maxY; y += spacing) {
    const screen = toScreen([0, y]);
    ctx.beginPath();
    ctx.moveTo(0, screen.y);
    ctx.lineTo(width, screen.y);
    ctx.stroke();
    if (Math.abs(y) > spacing / 10) {
      ctx.fillText(formatNumber(y), Math.min(width - 28, Math.max(6, toScreen([0, 0]).x + 6)), screen.y - 4);
    }
  }

  const origin = toScreen([0, 0]);
  ctx.strokeStyle = colors.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(width, origin.y);
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, height);
  ctx.stroke();

  ctx.fillStyle = colors.axis;
  ctx.font = "700 13px Inter, system-ui, sans-serif";
  ctx.fillText("x", width - 18, origin.y - 8);
  ctx.fillText("y", origin.x + 8, 16);
}

function gridSpacing() {
  const targetPixels = 70;
  const rough = targetPixels / view.scale;
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  const multiplier = normalized < 2 ? 1 : normalized < 5 ? 2 : 5;
  return multiplier * power;
}

function drawPolygon(polyPoints, stroke, fill, pointColor, pointRadius = 4.5, dashed = false) {
  if (!polyPoints.length) return;

  ctx.lineWidth = 2.5;
  ctx.setLineDash(dashed ? [8, 6] : []);
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.beginPath();
  polyPoints.forEach((point, index) => {
    const screen = toScreen(point);
    if (index === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  if (polyPoints.length > 2) {
    ctx.closePath();
    ctx.fill();
  }
  ctx.stroke();
  ctx.setLineDash([]);

  polyPoints.forEach((point, index) => {
    const screen = toScreen(point);
    ctx.beginPath();
    ctx.fillStyle = pointColor;
    ctx.arc(screen.x, screen.y, pointRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.axis;
    ctx.font = "700 12px Inter, system-ui, sans-serif";
    ctx.fillText(String(index + 1), screen.x + 7, screen.y - 7);
  });
}

function renderTables() {
  elements.pointsTable.innerHTML = "";
  elements.transformedTable.innerHTML = "";

  if (!points.length) {
    elements.pointsTable.innerHTML = `<tr><td class="empty-row" colspan="4">No points yet.</td></tr>`;
    elements.transformedTable.innerHTML = `<tr><td class="empty-row" colspan="3">No transformed points yet.</td></tr>`;
    return;
  }

  points.forEach(([x, y], index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatNumber(x)}</td>
      <td>${formatNumber(y)}</td>
      <td><button type="button" class="remove-point" data-index="${index}" aria-label="Remove point ${index + 1}">×</button></td>
    `;
    elements.pointsTable.append(row);
  });

  transformedPoints.forEach(([x, y], index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatNumber(x)}</td>
      <td>${formatNumber(y)}</td>
    `;
    elements.transformedTable.append(row);
  });
}

function render() {
  drawGrid();
  drawPolygon(transformedPoints, colors.transformed, colors.transformedFill, colors.transformed, 3.8, true);
  drawPolygon(points, colors.original, colors.originalFill, colors.point, 4.8);
  renderTables();
}

function handlePointSubmit(event) {
  event.preventDefault();
  const x = parseNumericInput(elements.pointX.value);
  const y = parseNumericInput(elements.pointY.value);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    setStatus("Enter valid numeric x and y coordinates before adding a point.", true);
    return;
  }

  addPoint(x, y);
  elements.pointForm.reset();
  elements.pointX.focus();
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function handlePointerDown(event) {
  isPanning = true;
  lastPointer = pointerPosition(event);
  canvas.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  if (!isPanning || !lastPointer) return;
  const nextPointer = pointerPosition(event);
  view.offsetX += nextPointer.x - lastPointer.x;
  view.offsetY += nextPointer.y - lastPointer.y;
  lastPointer = nextPointer;
  render();
}

function handlePointerUp(event) {
  isPanning = false;
  lastPointer = null;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function initialize() {
  writeMatrix(matrixPresets.identity);
  loadShape("square");

  elements.shapePreset.addEventListener("change", (event) => loadShape(event.target.value));
  elements.pointForm.addEventListener("submit", handlePointSubmit);
  elements.pointsTable.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (button) removePoint(Number.parseInt(button.dataset.index, 10));
  });

  Object.values(elements.matrix).forEach((input) => {
    input.addEventListener("input", () => applyTransformation({ updateStatus: false }));
  });

  document.querySelectorAll("[data-matrix]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = matrixPresets[button.dataset.matrix];
      writeMatrix(preset);
      applyTransformation({ updateStatus: true });
    });
  });

  elements.applyButton.addEventListener("click", () => applyTransformation({ updateStatus: true }));
  elements.resetMatrixButton.addEventListener("click", () => {
    writeMatrix(matrixPresets.identity);
    applyTransformation({ updateStatus: false });
    setStatus("Matrix reset to identity.");
  });
  elements.clearShapeButton.addEventListener("click", clearShape);
  elements.fitButton.addEventListener("click", fitToShapes);
  elements.zoomInButton.addEventListener("click", () => {
    const { width, height } = canvasSize();
    zoomAt(1.2, { x: width / 2, y: height / 2 });
  });
  elements.zoomOutButton.addEventListener("click", () => {
    const { width, height } = canvasSize();
    zoomAt(1 / 1.2, { x: width / 2, y: height / 2 });
  });

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, pointerPosition(event));
    },
    { passive: false },
  );

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  fitToShapes();
}

initialize();
