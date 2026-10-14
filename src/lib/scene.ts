/**
 * Contrato da cena — HERO LIVE v3
 * Fonte oficial: gusta/Gusta_Hero_Exploded_LIVE_Assets_v3 (layers com alfa real, fundo independente).
 * Todos os layers ocupam o mesmo canvas 941×1672 e começam em transform identity (= composição exploded
 * aprovada). Não existe guitarra montada no stage: no fechamento o exploded inteiro só some (fade).
 */
import heroLive from "./hero-live.json";
import motionMap from "./living_pieces_motion_map.json";

export const CANVAS = { w: 941, h: 1672 };
export const HERO_MEDIA = { video: heroLive.video };

export type Label = "intro" | "contexto" | "regulagem" | "manutencao" | "customizacao" | "credibilidade" | "orcamento" | "cta";
export type ServiceId = "regulagem" | "manutencao" | "customizacao";

export type LayerId =
  | "00_static_core_remainder" | "01_upper_left_hardware" | "02_left_body_shell" | "03_top_right_plate"
  | "04_center_electronics" | "05_right_pickguard" | "06_lower_right_controls" | "07_lower_shell_hardware"
  | "08_left_lower_hardware";

/** z-index exatamente como 05_DOCS/layer_map_and_gsap_targets.json (de baixo para cima; o fundo vem antes). */
export const LAYER_ORDER: LayerId[] = [
  "00_static_core_remainder",
  "08_left_lower_hardware",
  "02_left_body_shell",
  "01_upper_left_hardware",
  "07_lower_shell_hardware",
  "06_lower_right_controls",
  "05_right_pickguard",
  "03_top_right_plate",
  "04_center_electronics",
];

/* ---------- Vida: profundidade / flutuação / parallax (06_MOTION_MAP/living_pieces_motion_map.json) ---------- */
export type Motion = { depth: number; floatX: number; floatY: number; rotate: number; mouseX: number; mouseY: number; duration: number };
export const MOTION_RULES = motionMap.rules;
export const MOTION: Record<LayerId, Motion> = Object.fromEntries(
  LAYER_ORDER.map((id) => [id, (motionMap.layers as Record<string, Motion>)[`${id}_clean.png`]]),
) as Record<LayerId, Motion>;
/** bbox (alfa) de cada layer no canvas → origem da flutuação no centro da própria peça. */
export const LAYER_BOX = heroLive.layers as Record<LayerId, [number, number, number, number]>;
/** área (no canvas) de cada costura recortada */
export const SEAM_BOX = heroLive.seams as Record<LayerId, [number, number, number, number]>;
export const layerCenter = (id: LayerId) => {
  const [l, t, r, b] = LAYER_BOX[id];
  return { x: (l + r) / 2, y: (t + b) / 2 };
};

/* ---------- Ênfase por serviço (layer_map_and_gsap_targets.json → focus_steps_mobile) ----------
 * Valores do JSON = px de tela no hero mobile. Convertidos para unidades do canvas pela escala do hero
 * de referência (hero_target_mobile_visual_only.png: master a 0,39× em 390×844). */
export const REF_SCALE = 0.39; // = escala do hero mobile (intro s 0.84 × u 0.464 em 390×844); px de tela → canvas
type Move = { x: number; y: number; scale?: number; rotate?: number };
type FocusDef = { active: LayerId[]; transform: Required<Move>; secondary?: Partial<Record<LayerId, Move>>; othersOpacity: number };
/** v3: peças sem foco nunca abaixo do piso do motion map (0,78); a hierarquia vem do glow/ring da ativa. */
const OTHERS_OPACITY = MOTION_RULES.non_active_opacity_floor;
/** v3: "leve scale" da peça ativa (motion map: active_piece_focus_scale). */
const ACTIVE_SCALE = MOTION_RULES.active_piece_focus_scale;
const FOCUS_JSON: Record<ServiceId, FocusDef> = {
  regulagem: {
    active: ["03_top_right_plate", "04_center_electronics"],
    transform: { x: 18, y: -8, scale: 1.025, rotate: 1.2 },
    othersOpacity: 0.82,
  },
  manutencao: {
    active: ["04_center_electronics", "06_lower_right_controls"],
    transform: { x: 24, y: 4, scale: 1.035, rotate: 0.6 },
    othersOpacity: 0.78,
  },
  customizacao: {
    active: ["02_left_body_shell", "05_right_pickguard"],
    transform: { x: 0, y: 6, scale: 1.035, rotate: -0.8 },
    secondary: { "02_left_body_shell": { x: -24, y: 8, rotate: -1.5 }, "05_right_pickguard": { x: 28, y: 4, rotate: 1.5 } },
    othersOpacity: 0.8,
  },
};

/** Layers que recebem a ênfase em cada serviço (os demais seguem flutuando, com menos destaque). */
export const activeLayersOf = (s: ServiceId) => FOCUS_JSON[s].active;

export type LayerVars = { x: number; y: number; scale: number; rotation: number; opacity: number };
export const IDENTITY: LayerVars = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };

/** Estado de cada layer para um foco (null = exploded base: tudo em identity). */
export function layerState(focus: ServiceId | null, id: LayerId): LayerVars {
  if (!focus) return IDENTITY;
  const f = FOCUS_JSON[focus];
  if (!f.active.includes(id)) return { ...IDENTITY, opacity: Math.max(f.othersOpacity, OTHERS_OPACITY) };
  const s = f.secondary?.[id];
  return {
    x: (f.transform.x + (s?.x ?? 0)) / REF_SCALE,
    y: (f.transform.y + (s?.y ?? 0)) / REF_SCALE,
    scale: Math.max(f.transform.scale, ACTIVE_SCALE) * (s?.scale ?? 1),
    rotation: f.transform.rotate + (s?.rotate ?? 0),
    opacity: 1,
  };
}

/** Pontos de referência no master (canvas 941×1672), conferidos sobre hero_exploded_master_reference.png. */
const P = {
  center: { x: 470, y: 790 },     // centro da composição exploded
  pickups: { x: 565, y: 885 },    // captadores (04_center_electronics)
  plate: { x: 540, y: 395 },      // neckplate (03_top_right_plate), junto ao braço
  pickguard: { x: 690, y: 860 },  // 05_right_pickguard
  bridge: { x: 612, y: 1075 },    // ponte (04)
  controls: { x: 840, y: 1150 },  // knobs/jack (06_lower_right_controls)
  shell: { x: 300, y: 950 },      // 02_left_body_shell
  custom: { x: 500, y: 900 },     // entre corpo e pickguard (customização)
};

/** Para onde cada hotspot aponta (acompanha o transform de ênfase do próprio layer). */
const HOTSPOT: Record<ServiceId, { layer: LayerId; at: { x: number; y: number } }> = {
  regulagem: { layer: "03_top_right_plate", at: P.plate },
  manutencao: { layer: "04_center_electronics", at: P.pickups },
  customizacao: { layer: "05_right_pickguard", at: P.pickguard },
};
/** Regiões técnicas em foco (o card nunca as cobre). */
export const FOCUS_ZONES: Record<ServiceId, { layer: LayerId; at: { x: number; y: number } }[]> = {
  regulagem: [{ layer: "03_top_right_plate", at: P.plate }, { layer: "04_center_electronics", at: P.bridge }],
  manutencao: [{ layer: "04_center_electronics", at: P.pickups }, { layer: "06_lower_right_controls", at: P.controls }],
  customizacao: [{ layer: "05_right_pickguard", at: P.pickguard }, { layer: "02_left_body_shell", at: P.shell }],
};

/** Aplica o transform do layer (origem no centro do canvas, como no CSS) a um ponto do canvas. */
export function pointOnLayer(focus: ServiceId | null, layer: LayerId, p: { x: number; y: number }) {
  const v = layerState(focus, layer);
  const cx = CANVAS.w / 2, cy = CANVAS.h / 2;
  const a = (v.rotation * Math.PI) / 180;
  const dx = (p.x - cx) * v.scale, dy = (p.y - cy) * v.scale;
  return { x: cx + dx * Math.cos(a) - dy * Math.sin(a) + v.x, y: cy + dx * Math.sin(a) + dy * Math.cos(a) + v.y };
}

export type Camera = { x: number; y: number; rotation: number; scale: number };
export type Shot = {
  camera: Camera;
  /** véu escuro sobre o exploded (credibilidade/orçamento) */
  dim: number;
  shadeTop: number;
  shadeBottom: number;
  shadeFull: number;
  focus: ServiceId | null;
  /** exploded visível (0 só no fechamento: a etapa inteira some antes do formulário) */
  hero: number;
  hotspot?: { x: number; y: number };
};

type ShotDef = {
  f: { x: number; y: number }; v: [number, number]; s: number; r: number;
  dim: number; shadeTop: number; shadeBottom: number; shadeFull: number;
  focus: ServiceId | null; hero?: number;
};

/** Projeta um ponto do canvas na viewport (origem 0 0, ordem translate→rotate→scale). */
export function project(c: Camera, p: { x: number; y: number }) {
  const a = (c.rotation * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  return { x: c.x + c.scale * (p.x * cos - p.y * sin), y: c.y + c.scale * (p.x * sin + p.y * cos) };
}

export function frame(f: { x: number; y: number }, vx: number, vy: number, s: number, r: number): Camera {
  const a = (r * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  return { x: vx - s * (f.x * cos - f.y * sin), y: vy - s * (f.x * sin + f.y * cos), rotation: r, scale: s };
}

export function isWide(vw: number, vh: number) {
  return vw >= 900 && vw / vh > 1.05;
}

/**
 * Enquadramentos por label — mesma coreografia aprovada: mesma ordem e mesmas variações de rotação
 * entre cenas (intro → +32° → +40° → +36° → +30° → +14° → +10°). O master já nasce inclinado como
 * o painel 01 do storyboard, então o hero usa rotação 0 (= master em identity).
 */
export function getShots(vw: number, vh: number): Record<Label, Shot> {
  const wide = isWide(vw, vh);
  const u = Math.min(vh / 1672, (vw / 941) * 1.12);
  const gx = wide ? 0.64 : 0.5;

  const defs: Record<Label, ShotDef> = wide
    ? {
        intro:        { f: P.center,  v: [gx, 0.5],   s: 1.0,  r: 0,  dim: 0.25,    shadeTop: 0, shadeBottom: 0.2, shadeFull: 0,    focus: null },
        contexto:     { f: P.pickups, v: [gx, 0.56],  s: 1.45, r: 32, dim: 0.3,  shadeTop: 0, shadeBottom: 0.2, shadeFull: 0,    focus: null },
        regulagem:    { f: P.center,  v: [gx, 0.52],  s: 0.98, r: 40, dim: 0,    shadeTop: 0, shadeBottom: 0.1, shadeFull: 0,    focus: "regulagem" },
        manutencao:   { f: P.pickups, v: [gx, 0.5],   s: 1.45, r: 36, dim: 0,    shadeTop: 0, shadeBottom: 0.1, shadeFull: 0,    focus: "manutencao" },
        customizacao: { f: P.custom,  v: [gx, 0.5],   s: 1.3,  r: 30, dim: 0,    shadeTop: 0, shadeBottom: 0.1, shadeFull: 0,    focus: "customizacao" },
        credibilidade:{ f: P.bridge,  v: [gx, 0.48],  s: 2.2,  r: 14, dim: 0.45, shadeTop: 0, shadeBottom: 0.3, shadeFull: 0.15, focus: null },
        orcamento:    { f: P.pickups, v: [gx, 0.5],   s: 1.9,  r: 10, dim: 0.5,  shadeTop: 0, shadeBottom: 0.3, shadeFull: 0.55, focus: null },
        cta:          { f: P.pickups, v: [gx, 0.5],   s: 1.9,  r: 10, dim: 0,    shadeTop: 0, shadeBottom: 0.2, shadeFull: 0,    focus: null, hero: 0 },
      }
    : {
        intro:        { f: P.center,  v: [0.5, 0.405], s: 0.84, r: 0,  dim: 0.25,    shadeTop: 0,   shadeBottom: 1,   shadeFull: 0,   focus: null },
        contexto:     { f: P.pickups, v: [0.52, 0.72], s: 1.3,  r: 32, dim: 0.4,  shadeTop: 1,   shadeBottom: 0.9, shadeFull: 0,   focus: null },
        regulagem:    { f: P.center,  v: [0.44, 0.56], s: 1.0,  r: 40, dim: 0,    shadeTop: 0.9, shadeBottom: 0.4, shadeFull: 0,   focus: "regulagem" },
        manutencao:   { f: P.pickups, v: [0.58, 0.6],  s: 1.12, r: 36, dim: 0,    shadeTop: 0.9, shadeBottom: 0.4, shadeFull: 0,   focus: "manutencao" },
        customizacao: { f: P.custom,  v: [0.5, 0.56],  s: 1.1,  r: 30, dim: 0,    shadeTop: 0.9, shadeBottom: 0.4, shadeFull: 0,   focus: "customizacao" },
        credibilidade:{ f: P.bridge,  v: [0.5, 0.21],  s: 2.0,  r: 14, dim: 0.5,  shadeTop: 0.5, shadeBottom: 1,   shadeFull: 0,   focus: null },
        orcamento:    { f: P.pickups, v: [0.5, 0.2],   s: 2.1,  r: 10, dim: 0.6,  shadeTop: 0.5, shadeBottom: 1,   shadeFull: 0.6, focus: null },
        cta:          { f: P.pickups, v: [0.5, 0.2],   s: 2.1,  r: 10, dim: 0,    shadeTop: 0,   shadeBottom: 1,   shadeFull: 0,   focus: null, hero: 0 },
      };

  const out = {} as Record<Label, Shot>;
  (Object.keys(defs) as Label[]).forEach((k) => {
    const d = defs[k];
    const camera = frame(d.f, d.v[0] * vw, d.v[1] * vh, d.s * u, d.r);
    const hs = d.focus ? HOTSPOT[d.focus] : null;
    out[k] = {
      camera,
      dim: d.dim, shadeTop: d.shadeTop, shadeBottom: d.shadeBottom, shadeFull: d.shadeFull,
      focus: d.focus, hero: d.hero ?? 1,
      hotspot: hs && d.focus ? project(camera, pointOnLayer(d.focus, hs.layer, hs.at)) : undefined,
    };
  });
  return out;
}
