import { escape } from "../lib/html.mjs";

function escapeJson(str) {
  return str.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

const LOADER = `
if (!window.__hsChartLoaded) {
  window.__hsChartLoaded = true;
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  s.onload = function() { window.__hsChartReady && window.__hsChartReady(); };
  document.head.appendChild(s);
}
`.trim();

// Shadcn-style chart init — applies CSS vars for colors, rounded bars, clean axes
const SHADCN_INIT = `
(function () {
  if (window.__hsShadcnChartInited) return;
  window.__hsShadcnChartInited = true;
  var ready = window.__hsChartOnReady || [];
  window.__hsChartOnReady = { push: function(fn){ fn(); } };
  ready.forEach(function(fn){ fn(); });
}());
`.trim();

export function Chart(props) {
  const kind   = props.kind;
  const data   = props.data;
  const isArea = kind === "area";
  const chartKind = isArea ? "line" : kind;
  const isLine = kind === "line" || isArea;
  const isScatter = kind === "scatter";
  const isPoint = isLine || isScatter;

  // CSS variable names for each series
  const CHART_VARS = ["--op-chart-1","--op-chart-2","--op-chart-3","--op-chart-4","--op-chart-5"];

  const datasets = data.series.map((s, i) => {
    const varName = CHART_VARS[i % CHART_VARS.length];
    return {
      name:             s.name,
      label:            s.name,
      data:             s.values,
      fill:             isArea,
      // placeholder — real color injected at runtime via __hsColorizeChart
      _colorVar:        varName,
      tension:          isLine ? 0.3 : undefined,
      pointRadius:      isPoint ? 4 : undefined,
      pointHoverRadius: isPoint ? 6 : undefined,
      pointHitRadius:   isPoint ? 16 : undefined,
      borderWidth:      isPoint ? 2 : (kind === "bar" ? 0 : undefined),
      borderRadius:     kind === "bar" ? 6 : undefined,
      borderSkipped:    kind === "bar" ? false : undefined,
    };
  });

  const config = {
    type: chartKind,
    data: { labels: data.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: isPoint ? { mode: "nearest", intersect: false } : { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: datasets.length > 1,
          position: "bottom",
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 3,
            useBorderRadius: true,
            padding: 16,
            font: { size: 12 },
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: "hsl(240 10% 3.9%)",
          titleColor: "hsl(0 0% 98%)",
          bodyColor: "hsl(240 5% 64.9%)",
          borderColor: "hsl(240 3.7% 15.9%)",
          borderWidth: 1,
          padding: { x: 12, y: 10 },
          cornerRadius: 6,
          titleFont: { size: 12, weight: "600" },
          bodyFont: { size: 12 },
        }
      },
      scales: ["pie", "doughnut"].includes(kind) ? undefined : {
        x: {
          border:   { display: false },
          grid:     { display: false },
          ticks:    {
            color: "hsl(240 5% 64.9%)",
            font:  { size: 12 },
            maxRotation: 0,
          },
          title: { display: !!props.xLabel, text: props.xLabel || "", color: "hsl(240 5% 64.9%)" }
        },
        y: {
          border: { display: false, dash: [4, 4] },
          grid:   { color: "hsl(240 3.7% 15.9%)", drawTicks: false },
          ticks:  {
            color: "hsl(240 5% 64.9%)",
            font:  { size: 12 },
            padding: 8,
          },
          title: { display: !!props.yLabel, text: props.yLabel || "", color: "hsl(240 5% 64.9%)" }
        }
      }
    }
  };

  const canvasId = "hsChart_" + Math.random().toString(36).slice(2, 10);
  const cap = (props.xLabel || props.yLabel)
    ? `<figcaption class="op-chart-cap">${escape(props.xLabel || "")}${props.yLabel ? " × " + escape(props.yLabel) : ""}${props.unit ? " (" + escape(props.unit) + ")" : ""}</figcaption>`
    : "";

  const initScript = `
(function(){
  var id   = '${canvasId}';
  var unit = ${JSON.stringify(props.unit || "")};
  var rawCfg = JSON.parse('${escapeJson(JSON.stringify(config))}');

  function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
        || getComputedStyle(document.body).getPropertyValue(name).trim();
  }

  function hexAlpha(hslStr, alpha) {
    // create a tiny canvas to resolve hsl → rgba
    try {
      var tmp = document.createElement('canvas');
      tmp.width = tmp.height = 1;
      var ctx2d = tmp.getContext('2d');
      ctx2d.fillStyle = hslStr;
      ctx2d.fillRect(0,0,1,1);
      var d = ctx2d.getImageData(0,0,1,1).data;
      return 'rgba(' + d[0] + ',' + d[1] + ',' + d[2] + ',' + alpha + ')';
    } catch(e) { return hslStr; }
  }

  function applyColors(cfg) {
    var datasets = cfg.data && cfg.data.datasets;
    if (!datasets) return;
    datasets.forEach(function(ds) {
      var vr = ds._colorVar;
      if (!vr) return;
      var color = getCssVar(vr);
      if (!color) color = ds._colorVar; // fallback
      ds.backgroundColor = cfg.type === 'line' || cfg.type === 'scatter'
        ? hexAlpha(color, 0.15)
        : color;
      ds.borderColor = color;
      ds.pointBackgroundColor = color;
      ds.pointBorderColor = color;
      delete ds._colorVar;
    });
    // legend dot colors
    if (cfg.options && cfg.options.plugins && cfg.options.plugins.legend) {
      cfg.options.plugins.legend.labels = cfg.options.plugins.legend.labels || {};
      cfg.options.plugins.legend.labels.color = getCssVar('--op-color-muted-fg') || 'hsl(240 5% 64.9%)';
    }
  }

  function addTooltipCallback(cfg) {
    cfg.options = cfg.options || {};
    cfg.options.plugins = cfg.options.plugins || {};
    cfg.options.plugins.tooltip = cfg.options.plugins.tooltip || {};
    cfg.options.plugins.tooltip.callbacks = {
      label: function(ctx) {
        var prefix = ctx.dataset && ctx.dataset.label ? ctx.dataset.label + ': ' : '';
        var raw = ctx.raw;
        if (raw && typeof raw === 'object' && raw.y != null) raw = raw.y;
        return prefix + (unit ? unit : '') + raw;
      }
    };
  }

  function render() {
    var canvas = document.getElementById(id);
    if (!canvas || !window.Chart) { setTimeout(render, 50); return; }
    applyColors(rawCfg);
    addTooltipCallback(rawCfg);
    new window.Chart(canvas, rawCfg);
  }

  if (window.Chart) render();
  else {
    var prev = window.__hsChartReady;
    window.__hsChartReady = function(){ prev && prev(); render(); };
  }
})();
`.trim();

  return `<figure class="op-chart-wrap"><canvas class="op-chart" data-kind="${escape(kind)}" id="${canvasId}"></canvas>${cap}<script>${LOADER}</script><script>${initScript}</script></figure>`;
}
