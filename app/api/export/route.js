import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const C = {
  green:    "FF53FC18", greenDark: "FF1A5C0A", greenBg: "FF0D2A0D",
  black:    "FF0A0A0A", white: "FFFFFFFF",
  gray1:    "FFF7F7F7", gray2: "FFEEEEEE",
  neutral:  "FF888888", headerBg: "FF111111",
  orange:   "FFEA580C", blue: "FF3B82F6",
  yellow:   "FFFBBF24", red: "FFEF4444",
};
const font = {
  hdr:  { name: "Calibri", size: 11, bold: true, color: { argb: C.white } },
  body: { name: "Calibri", size: 10 },
  bold: { name: "Calibri", size: 10, bold: true },
  meta: { name: "Calibri", size: 10, color: { argb: C.neutral } },
  grn:  { name: "Calibri", size: 10, bold: true, color: { argb: C.greenDark } },
  org:  { name: "Calibri", size: 10, bold: true, color: { argb: C.orange } },
};
const fill  = (a)   => ({ type: "pattern", pattern: "solid", fgColor: { argb: a } });
const brd   = { style: "thin", color: { argb: "FFD0D0D0" } };
const bords = { top: brd, left: brd, bottom: brd, right: brd };
const right = { horizontal: "right" };
const ctr   = { horizontal: "center", vertical: "middle" };

// Prevent formula injection: prefix dangerous chars with apostrophe.
function safeStr(v) {
  const s = String(v ?? "");
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

function fmtDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
function fmtDur(ms) {
  if (!ms || ms < 0) return "";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}h ${m}m ${sec}s` : m ? `${m}m ${sec}s` : `${sec}s`;
}
function fmtTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
}

function hdrRow(ws, cols) {
  const r = ws.addRow(cols.map((c) => c.header ?? c));
  r.height = 22;
  r.eachCell((cell) => {
    cell.font = font.hdr; cell.fill = fill(C.headerBg);
    cell.border = bords; cell.alignment = ctr;
  });
  return r;
}
function dataRow(ws, values, idx) {
  const r   = ws.addRow(values);
  const bg  = fill(idx % 2 === 0 ? C.gray1 : C.white);
  r.eachCell((cell) => { cell.font = font.body; cell.fill = bg; cell.border = bords; });
  return r;
}

export async function POST(request) {
  const body = await request.json();
  const {
    ranking = [], emoteRanking = [], peaks = [], titleChanges = [],
    categoryHistory = [], comboHistory = [],
    stats, channelInfo,
  } = body;

  const wb      = new ExcelJS.Workbook();
  wb.creator    = "ChatStats";
  wb.created    = new Date();

  const channel = safeStr(channelInfo?.user?.username || channelInfo?.slug || "stream");
  const total   = stats?.totalMessages || 0;
  const now     = new Date();
  const sessDur = stats?.startedAt && stats?.stoppedAt ? stats.stoppedAt - stats.startedAt : 0;
  const stamp   = now.toISOString().slice(0,16).replace(/[T:]/g,"-");

  // ── 1. RESUMEN ─────────────────────────────────────────────────────────────
  const ws1 = wb.addWorksheet("Resumen", { views:[{ showGridLines:false }] });
  ws1.columns = [{ width:30 },{ width:42 },{ width:20 }];

  // Title
  const titleRow = ws1.addRow(["ChatStats — Resumen de sesión"]);
  titleRow.getCell(1).font = { name:"Calibri", size:18, bold:true, color:{ argb: C.greenDark } };
  ws1.addRow(["Exportado el " + fmtDate(now)]).getCell(1).font = font.meta;
  ws1.addRow([]);

  // Channel block
  const addMeta = (label, value, accent) => {
    const r = ws1.addRow([label, value]);
    r.getCell(1).font  = font.bold; r.getCell(1).fill  = fill(C.gray1);
    r.getCell(2).font  = accent ? font.grn : font.body; r.getCell(2).fill = fill(C.white);
    [1,2].forEach((i) => { r.getCell(i).border = bords; });
  };
  addMeta("Canal",           channel);
  addMeta("Verificado",      channelInfo?.verified ? "✓ Sí" : "No");
  addMeta("Categoría",       channelInfo?.streamCategory || "—");
  addMeta("Título del stream", channelInfo?.streamTitle || "—");
  if (channelInfo?.streamTags?.length) addMeta("Etiquetas", channelInfo.streamTags.join(", "));
  if (channelInfo?.followersCount)     addMeta("Seguidores", channelInfo.followersCount.toLocaleString("es-AR"));
  addMeta("Inicio del stream", fmtDate(channelInfo?.liveStartedAt));
  addMeta("Inicio de sesión",  fmtDate(stats?.startedAt));
  addMeta("Fin de sesión",     fmtDate(stats?.stoppedAt));
  addMeta("Duración sesión",   fmtDur(sessDur));
  ws1.addRow([]);

  // KPI section header
  const kpiHdr = ws1.addRow(["ESTADÍSTICAS PRINCIPALES"]);
  kpiHdr.getCell(1).font = font.hdr; kpiHdr.getCell(1).fill = fill(C.headerBg);
  ws1.mergeCells(`A${kpiHdr.number}:B${kpiHdr.number}`);

  const kpis = [
    ["Mensajes totales",      total.toLocaleString("es-AR"),                              true],
    ["Usuarios únicos",       (stats?.uniqueUsers||0).toLocaleString("es-AR"),            false],
    ["Msgs promedio/min",     sessDur > 0 ? (total/(sessDur/60000)).toFixed(1) : "—",    false],
    ["Picos detectados",      peaks.length,                                               false],
    ["Emotes trackeados",     emoteRanking.length,                                        false],
    ["Combos registrados",    comboHistory.length,                                        false],
    ["Cambios de título",     titleChanges.length,                                        false],
    ["Categorías distintas",  new Set(categoryHistory.map(c=>c.category)).size || "—",   false],
  ];
  kpis.forEach(([k,v,acc], i) => {
    const r = ws1.addRow([k, v]);
    r.getCell(1).font = font.body; r.getCell(1).fill = fill(i%2===0?C.gray1:C.white);
    r.getCell(2).font = acc ? font.grn : font.bold; r.getCell(2).fill = fill(i%2===0?C.gray1:C.white);
    [1,2].forEach((ci) => { r.getCell(ci).border = bords; });
  });

  // Peak / Quiet highlights
  if (peaks.length > 0) {
    ws1.addRow([]);
    const phdr = ws1.addRow(["MOMENTOS DESTACADOS"]);
    phdr.getCell(1).font = font.hdr; phdr.getCell(1).fill = fill(C.headerBg);
    ws1.mergeCells(`A${phdr.number}:B${phdr.number}`);

    const top = peaks.reduce((a,b) => b.count>a.count?b:a);
    const r1  = ws1.addRow(["Pico máximo", `${top.count} msgs/min a las ${fmtTime(top.ts)} (×${top.avg>0?(top.count/top.avg).toFixed(1):"—"} vs media)`]);
    r1.getCell(1).font = font.bold; r1.getCell(2).font = font.org;
    [1,2].forEach(i => { r1.getCell(i).fill = fill(C.gray1); r1.getCell(i).border = bords; });
  }

  // ── 2. RANKING ─────────────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet("Ranking", { views:[{ state:"frozen", ySplit:1, showGridLines:false }] });
  ws2.columns = [
    { key:"rank",     width:8  }, { key:"username", width:24 },
    { key:"msgs",     width:12 }, { key:"pct",      width:12 },
    { key:"rate",     width:14 }, { key:"streak",   width:12 },
    { key:"duration", width:18 }, { key:"first",    width:20 },
    { key:"last",     width:20 }, { key:"emote",    width:18 },
    { key:"emoCount", width:12 },
  ];
  hdrRow(ws2, ["#","Usuario","Mensajes","% chat","Msgs/min","Racha (min)","Tiempo activo","Primer msg","Último msg","Emote fav.","Usos"]);

  ranking.forEach((u, i) => {
    let topName="", topCount=0;
    if (u.emoteCounts) for (const [n,c] of Object.entries(u.emoteCounts)) { if(c>topCount){topCount=c;topName=n;} }
    const pct  = total>0 ? ((u.count/total)*100).toFixed(2)+"%" : "";
    const durMs = u.lastSeen - u.firstSeen;
    const rate  = durMs>30000 ? (u.count/(durMs/60000)).toFixed(2) : "";
    const r = dataRow(ws2, [i+1, u.username, u.count, pct, rate, u.streak||"",
      fmtDur(durMs), fmtDate(u.firstSeen), fmtDate(u.lastSeen), topName, topCount||""], i);
    if (i===0) r.getCell("rank").font = {...font.bold, color:{argb:C.yellow}};
    if (i===1) r.getCell("rank").font = {...font.bold, color:{argb:"FFC0C0C0"}};
    if (i===2) r.getCell("rank").font = {...font.bold, color:{argb:"FFCD7F32"}};
    ["msgs","pct","rate","streak","emoCount"].forEach(k => { r.getCell(k).alignment = right; });
    r.getCell("rank").alignment = ctr;
    if ((u.streak||0) >= 5) r.getCell("streak").font = {...font.bold, color:{argb:C.orange}};
  });

  // ── 3. TOP EMOTES ──────────────────────────────────────────────────────────
  if (emoteRanking.length > 0) {
    const ws3 = wb.addWorksheet("Top Emotes", { views:[{ state:"frozen", ySplit:1, showGridLines:false }] });
    ws3.columns = [{ key:"rank",width:8 },{ key:"name",width:24 },{ key:"count",width:12 },{ key:"pct",width:14 }];
    hdrRow(ws3, ["#","Emote","Usos","% total"]);
    emoteRanking.forEach((e,i) => {
      const pct = total>0 ? ((e.count/total)*100).toFixed(2)+"%" : "";
      const r   = dataRow(ws3, [i+1, e.name, e.count, pct], i);
      r.getCell("rank").alignment = ctr;
      r.getCell("count").alignment = right;
      r.getCell("pct").alignment   = right;
    });
  }

  // ── 4. COMBOS ──────────────────────────────────────────────────────────────
  if (comboHistory.length > 0) {
    const ws4 = wb.addWorksheet("Combos", { views:[{ state:"frozen", ySplit:1, showGridLines:false }] });
    ws4.columns = [{ key:"emote",width:24 },{ key:"max",width:14 },{ key:"time",width:20 }];
    hdrRow(ws4, ["Emote","Máx ×","Hora del pico"]);
    const sorted = [...comboHistory].sort((a,b) => b.maxCount - a.maxCount);
    sorted.forEach((c,i) => {
      const r = dataRow(ws4, [c.name, `×${c.maxCount}`, fmtTime(c.ts)], i);
      r.getCell("max").font = {...font.bold, color:{argb:C.orange}};
      r.getCell("max").alignment = ctr;
    });
  }

  // ── 5. CATEGORÍAS ──────────────────────────────────────────────────────────
  if (categoryHistory.length > 0) {
    const ws5   = wb.addWorksheet("Categorías", { views:[{ state:"frozen", ySplit:1, showGridLines:false }] });
    ws5.columns = [{ key:"cat",width:30 },{ key:"start",width:20 },{ key:"end",width:20 },{ key:"dur",width:16 }];
    hdrRow(ws5, ["Categoría","Inicio","Fin","Duración"]);
    categoryHistory.forEach((c,i) => {
      const end   = categoryHistory[i+1]?.startTs ?? (stats?.stoppedAt || Date.now());
      const r     = dataRow(ws5, [c.category, fmtDate(c.startTs), fmtDate(end), fmtDur(end-c.startTs)], i);
      r.getCell("dur").font = font.grn;
    });

    // Aggregate totals below
    ws5.addRow([]);
    const totals = {};
    categoryHistory.forEach((c,i) => {
      const end = categoryHistory[i+1]?.startTs ?? (stats?.stoppedAt || Date.now());
      totals[c.category] = (totals[c.category]||0) + (end - c.startTs);
    });
    const totHdr = ws5.addRow(["TOTAL POR CATEGORÍA"]);
    totHdr.getCell(1).font = font.hdr; totHdr.getCell(1).fill = fill(C.headerBg);
    ws5.mergeCells(`A${totHdr.number}:D${totHdr.number}`);
    Object.entries(totals).sort((a,b)=>b[1]-a[1]).forEach(([cat,dur],i) => {
      const r = dataRow(ws5, [cat, "", "", fmtDur(dur)], i);
      r.getCell("dur").font = font.bold;
    });
  }

  // ── 6. PICOS ───────────────────────────────────────────────────────────────
  if (peaks.length > 0) {
    const ws6 = wb.addWorksheet("Picos", { views:[{ state:"frozen", ySplit:1, showGridLines:false }] });
    ws6.columns = [{ key:"time",width:16 },{ key:"msgs",width:16 },{ key:"users",width:14 },{ key:"avg",width:14 },{ key:"mult",width:14 }];
    hdrRow(ws6, ["Hora","Msgs/min","Usuarios únicos","Media previa","Multiplicador"]);
    [...peaks].sort((a,b)=>b.count-a.count).forEach((p,i) => {
      const r = dataRow(ws6, [
        fmtTime(p.ts), p.count, p.uniqueUsers||"—", p.avg,
        p.avg>0 ? `×${(p.count/p.avg).toFixed(1)}` : "—"
      ], i);
      r.getCell("msgs").font = i===0 ? font.grn : font.body;
      r.getCell("mult").font = {...font.bold, color:{argb:C.orange}};
      r.getCell("mult").alignment = ctr;
    });
  }

  // ── 7. CAMBIOS DE TÍTULO ───────────────────────────────────────────────────
  if (titleChanges.length > 0) {
    const ws7 = wb.addWorksheet("Cambios de título", { views:[{ state:"frozen", ySplit:1, showGridLines:false }] });
    ws7.columns = [{ key:"time",width:16 },{ key:"from",width:50 },{ key:"to",width:50 }];
    hdrRow(ws7, ["Hora","Título anterior","Título nuevo"]);
    titleChanges.forEach((t,i) => dataRow(ws7, [fmtTime(t.ts), t.from, t.to], i));
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="chatstats-${channel}-${stamp}.xlsx"`,
    },
  });
}
