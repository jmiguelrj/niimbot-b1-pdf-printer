export type IconName =
  | "brandMark"
  | "usb"
  | "bluetooth"
  | "printer"
  | "sparkles"
  | "uploadPdf"
  | "check"
  | "sun"
  | "moon"
  | "autoTheme"
  | "terminal"
  | "play"
  | "stop"
  | "refresh"
  | "downloadApp"
  | "disconnect"
  | "info"
  | "book"
  | "close"
  | "layers"
  | "sliders";

interface SvgNodeDef {
  tag: "path" | "rect" | "circle" | "polyline" | "line" | "polygon";
  attrs: Record<string, string>;
}

const SVG_NS = "http://www.w3.org/2000/svg";

const ICON_DEFINITIONS: Record<IconName, readonly SvgNodeDef[]> = {
  brandMark: [
    { tag: "rect", attrs: { x: "5", y: "3", width: "14", height: "8", rx: "2" } },
    {
      tag: "path",
      attrs: {
        d: "M 4 11 H 20 A 2 2 0 0 1 22 13 V 18 A 2 2 0 0 1 20 20 H 4 A 2 2 0 0 1 2 18 V 13 A 2 2 0 0 1 4 11 Z",
      },
    },
    { tag: "circle", attrs: { cx: "12", cy: "15.5", r: "1.5" } },
  ],
  usb: [
    { tag: "circle", attrs: { cx: "12", cy: "19", r: "2" } },
    { tag: "line", attrs: { x1: "12", y1: "17", x2: "12", y2: "4" } },
    { tag: "polyline", attrs: { points: "9 7 12 4 15 7" } },
    { tag: "path", attrs: { d: "M 12 14 L 7 11 V 8" } },
    { tag: "circle", attrs: { cx: "7", cy: "7", r: "1.2" } },
    { tag: "path", attrs: { d: "M 12 12 L 17 9 V 7" } },
    { tag: "rect", attrs: { x: "15.8", y: "5", width: "2.4", height: "2.4", rx: "0.4" } },
  ],
  bluetooth: [{ tag: "polyline", attrs: { points: "7 7 17 17 12 22 12 2 17 7 7 17" } }],
  printer: [
    { tag: "polyline", attrs: { points: "6 9 6 3 18 3 18 9" } },
    {
      tag: "path",
      attrs: {
        d: "M 6 18 H 4 A 2 2 0 0 1 2 16 V 11 A 2 2 0 0 1 4 9 H 20 A 2 2 0 0 1 22 11 V 16 A 2 2 0 0 1 20 18 H 18",
      },
    },
    { tag: "rect", attrs: { x: "6", y: "14", width: "12", height: "7", rx: "1" } },
  ],
  sparkles: [
    {
      tag: "path",
      attrs: { d: "M 12 3 L 13.8 8.2 L 19 10 L 13.8 11.8 L 12 17 L 10.2 11.8 L 5 10 L 10.2 8.2 Z" },
    },
    {
      tag: "path",
      attrs: {
        d: "M 19 15 L 19.8 17.2 L 22 18 L 19.8 18.8 L 19 21 L 18.2 18.8 L 16 18 L 18.2 17.2 Z",
      },
    },
  ],
  uploadPdf: [
    {
      tag: "path",
      attrs: { d: "M 14 3 H 7 A 2 2 0 0 0 5 5 V 19 A 2 2 0 0 0 7 21 H 17 A 2 2 0 0 0 19 19 V 8 Z" },
    },
    { tag: "polyline", attrs: { points: "14 3 14 8 19 8" } },
    { tag: "line", attrs: { x1: "12", y1: "17", x2: "12", y2: "11" } },
    { tag: "polyline", attrs: { points: "9.5 13.5 12 11 14.5 13.5" } },
  ],
  check: [{ tag: "polyline", attrs: { points: "5 12.5 10 17.5 19 7" } }],
  sun: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "4" } },
    { tag: "line", attrs: { x1: "12", y1: "2", x2: "12", y2: "4.5" } },
    { tag: "line", attrs: { x1: "12", y1: "19.5", x2: "12", y2: "22" } },
    { tag: "line", attrs: { x1: "4.9", y1: "4.9", x2: "6.7", y2: "6.7" } },
    { tag: "line", attrs: { x1: "17.3", y1: "17.3", x2: "19.1", y2: "19.1" } },
    { tag: "line", attrs: { x1: "2", y1: "12", x2: "4.5", y2: "12" } },
    { tag: "line", attrs: { x1: "19.5", y1: "12", x2: "22", y2: "12" } },
    { tag: "line", attrs: { x1: "4.9", y1: "19.1", x2: "6.7", y2: "17.3" } },
    { tag: "line", attrs: { x1: "17.3", y1: "6.7", x2: "19.1", y2: "4.9" } },
  ],
  moon: [
    {
      tag: "path",
      attrs: { d: "M 20.5 14.5 A 8.5 8.5 0 0 1 9.5 3.5 A 8.5 8.5 0 1 0 20.5 14.5 Z" },
    },
  ],
  autoTheme: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
    { tag: "path", attrs: { d: "M 12 3 V 21" } },
    { tag: "path", attrs: { d: "M 12 7 L 17 12 L 12 17" } },
  ],
  terminal: [
    { tag: "rect", attrs: { x: "3", y: "4", width: "18", height: "16", rx: "3" } },
    { tag: "polyline", attrs: { points: "7 10 10 12.5 7 15" } },
    { tag: "line", attrs: { x1: "12.5", y1: "15", x2: "16.5", y2: "15" } },
  ],
  play: [{ tag: "polygon", attrs: { points: "7 5 19 12 7 19 7 5" } }],
  stop: [{ tag: "rect", attrs: { x: "6", y: "6", width: "12", height: "12", rx: "2.5" } }],
  refresh: [
    { tag: "path", attrs: { d: "M 20 11 A 8 8 0 0 0 6.3 6.3 L 4 8.5" } },
    { tag: "polyline", attrs: { points: "4 4 4 8.5 8.5 8.5" } },
    { tag: "path", attrs: { d: "M 4 13 A 8 8 0 0 0 17.7 17.7 L 20 15.5" } },
    { tag: "polyline", attrs: { points: "20 20 20 15.5 15.5 15.5" } },
  ],
  downloadApp: [
    { tag: "path", attrs: { d: "M 12 3 V 14" } },
    { tag: "polyline", attrs: { points: "8 10 12 14 16 10" } },
    { tag: "path", attrs: { d: "M 4 16 V 18 A 2 2 0 0 0 6 20 H 18 A 2 2 0 0 0 20 18 V 16" } },
  ],
  disconnect: [
    { tag: "path", attrs: { d: "M 18 6 L 6 18" } },
    { tag: "path", attrs: { d: "M 6 6 L 18 18" } },
  ],
  info: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
    { tag: "line", attrs: { x1: "12", y1: "11", x2: "12", y2: "16" } },
    { tag: "circle", attrs: { cx: "12", cy: "8", r: "0.7" } },
  ],
  book: [
    {
      tag: "path",
      attrs: {
        d: "M 4 5 A 2 2 0 0 1 6 3 H 11 A 2 2 0 0 1 13 5 V 20 A 2 2 0 0 0 11 18 H 6 A 2 2 0 0 0 4 20 Z",
      },
    },
    {
      tag: "path",
      attrs: { d: "M 20 5 A 2 2 0 0 0 18 3 H 13 V 20 A 2 2 0 0 1 15 18 H 18 A 2 2 0 0 1 20 20 Z" },
    },
  ],
  close: [
    { tag: "line", attrs: { x1: "18", y1: "6", x2: "6", y2: "18" } },
    { tag: "line", attrs: { x1: "6", y1: "6", x2: "18", y2: "18" } },
  ],
  layers: [
    { tag: "polygon", attrs: { points: "12 3 3 8 12 13 21 8 12 3" } },
    { tag: "polyline", attrs: { points: "3 12 12 17 21 12" } },
    { tag: "polyline", attrs: { points: "3 16 12 21 21 16" } },
  ],
  sliders: [
    { tag: "line", attrs: { x1: "4", y1: "7", x2: "20", y2: "7" } },
    { tag: "circle", attrs: { cx: "9", cy: "7", r: "2" } },
    { tag: "line", attrs: { x1: "4", y1: "17", x2: "20", y2: "17" } },
    { tag: "circle", attrs: { cx: "15", cy: "17", r: "2" } },
  ],
};

export function createIcon(name: IconName, size = 16): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("nb-icon");

  for (const def of ICON_DEFINITIONS[name]) {
    const child = document.createElementNS(SVG_NS, def.tag);
    for (const [attr, value] of Object.entries(def.attrs)) {
      child.setAttribute(attr, value);
    }
    svg.append(child);
  }

  return svg;
}
