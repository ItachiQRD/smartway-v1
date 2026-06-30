// Rendu du plan du magasin (canvas) : parcours client et heatmap manager.

const C = {
  floor: "#f1f5f9",
  grid: "rgba(11,27,51,0.04)",
  shelf: "#cbd5e1",
  shelfEdge: "#94a3b8",
  checkout: "#6d28d9",
  scango: "#0e9f6e",
  entrance: "#0e9f6e",
  path: "#0e9f6e",
  stop: "#f59e0b",
  stopText: "#1a2b45",
  text: "#475569",
};

function base(canvas, store, cell) {
  canvas.width = store.width * cell;
  canvas.height = store.height * cell;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = C.floor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= store.width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cell, 0);
    ctx.lineTo(x * cell, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= store.height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cell);
    ctx.lineTo(canvas.width, y * cell);
    ctx.stroke();
  }
  return ctx;
}

function shelves(ctx, store, cell, fill) {
  for (let y = 0; y < store.height; y++) {
    for (let x = 0; x < store.width; x++) {
      if (store.grid[y][x] === 1) {
        ctx.fillStyle = fill || C.shelf;
        roundRect(ctx, x * cell + 1, y * cell + 1, cell - 2, cell - 2, 4);
        ctx.fill();
      }
    }
  }
}

function checkoutsAndEntrance(ctx, store, cell) {
  for (const c of store.checkouts) {
    ctx.fillStyle = c.type === "scango" ? C.scango : C.checkout;
    roundRect(ctx, c.marker.x * cell + 1, c.marker.y * cell + 1, cell - 2, cell - 2, 4);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = `bold ${Math.round(cell * 0.42)}px Inter, Segoe UI`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.type === "scango" ? "S" : String(c.id), c.marker.x * cell + cell / 2, c.marker.y * cell + cell / 2);
  }
  const e = store.entrance;
  ctx.fillStyle = C.entrance;
  ctx.beginPath();
  ctx.arc(e.x * cell + cell / 2, e.y * cell + cell / 2, cell / 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = `bold ${Math.round(cell * 0.3)}px Inter, Segoe UI`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("IN", e.x * cell + cell / 2, e.y * cell + cell / 2);
}

export function drawStore(canvas, store, route, progress) {
  const cell = 26;
  const ctx = base(canvas, store, cell);
  shelves(ctx, store, cell);
  checkoutsAndEntrance(ctx, store, cell);

  if (route?.path?.length > 1) {
    ctx.strokeStyle = C.path;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    route.path.forEach((p, i) => {
      const cx = p.x * cell + cell / 2;
      const cy = p.y * cell + cell / 2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    (route.stops || []).forEach((s) => {
      const done = progress?.has(s.id);
      drawStop(ctx, s.access, cell, s.order, done);
    });
  }
}

function drawStop(ctx, pos, cell, num, done) {
  const cx = pos.x * cell + cell / 2;
  const cy = pos.y * cell + cell / 2;
  ctx.fillStyle = done ? C.scango : C.stop;
  ctx.beginPath();
  ctx.arc(cx, cy, cell / 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = done ? "white" : C.stopText;
  ctx.font = `bold ${Math.round(cell * 0.5)}px Inter, Segoe UI`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(done ? "✓" : String(num), cx, cy);
}

export function drawHeatmap(canvas, store, zones) {
  const cell = 24;
  const ctx = base(canvas, store, cell);

  for (const z of zones) {
    const { xMin, xMax, yMin, yMax } = z.bounds;
    const x = xMin * cell;
    const y = yMin * cell;
    const w = (xMax - xMin + 1) * cell;
    const hgt = (yMax - yMin + 1) * cell;
    const cx = x + w / 2;
    const cy = y + hgt / 2;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(w, hgt) / 1.3);
    const col = heatColor(z.intensity ?? 0);
    grad.addColorStop(0, col + "dd");
    grad.addColorStop(1, col + "10");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, hgt);
  }

  shelves(ctx, store, cell, "rgba(148,163,184,0.85)");
  checkoutsAndEntrance(ctx, store, cell);

  ctx.font = `bold ${Math.round(cell * 0.5)}px Inter, Segoe UI`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const z of zones) {
    const { xMin, xMax, yMin, yMax } = z.bounds;
    const cx = ((xMin + xMax + 1) / 2) * cell;
    const cy = ((yMin + yMax + 1) / 2) * cell;
    ctx.fillStyle = "rgba(11,27,51,0.78)";
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.fillText(String(z.shoppers), cx, cy);
  }
}

function heatColor(t) {
  const stops = [
    [59, 130, 246],
    [14, 159, 110],
    [245, 158, 11],
    [239, 68, 68],
  ];
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = stops[i];
  const b = stops[Math.min(i + 1, stops.length - 1)];
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
