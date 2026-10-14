import gsap from "gsap";
import { LAYER_ORDER, MOTION, MOTION_RULES, type Camera, type LayerId, type ServiceId } from "./scene";

/**
 * Camada SECUNDÁRIA de vida do hero (spec v3 §3–4). Nunca toca nos elementos do scroll:
 *   .part-float   ← microflutuação contínua (este módulo)
 *   .part-pointer ← parallax do mouse (este módulo, desktop)
 *   .part-scroll  ← GSAP/ScrollTrigger aprovado (narrative.ts)
 * Flutuação = senoides determinísticas por layer (períodos e fases próprios, sem aleatoriedade),
 * num único ticker. A amplitude é suavizada (não "salta") e:
 *   - peça ativa: ×active_piece_float_multiplier (não congela, só desacelera/reduz);
 *   - fechamento: → 0 junto com o fade de saída (ticker fica ocioso).
 * Custo por frame: 1 escrita de transform por wrapper (sem layout, sem leitura de estilo).
 */

/** Constantes da camada de vida (centralizadas). */
export const LIVING = {
  /** suavização da amplitude da flutuação (1/s) — entrada/saída do foco e do fechamento */
  ampRate: 3.2,
  /** suavização do parallax do mouse (1/s): ≈ quickTo power3.out 0,9 s, sem recriar tweens a cada evento */
  pointerRate: 4.5,
  /** raio do anel do hotspot (px de tela): a ponta da seta para na borda do anel */
  ringR: 17,
  /** ponta (tip) do focus_arrow.svg dentro da caixa .leader-head (15×22 px) */
  headTip: { x: 12.27, y: 11 },
};

export type Leader = { el: HTMLElement; len: HTMLElement; head: HTMLElement; base: number };

export type FocusUi = {
  layer: LayerId;
  camera: Camera;
  hs: { x: number; y: number };       // centro do hotspot (viewport, sem flutuação)
  anchor: { x: number; y: number };   // ponto do card onde a seta termina
  follow: HTMLElement;                 // wrapper do ring que acompanha a peça
  leader: Leader;
};

/**
 * Posiciona a seta só com transforms (compositor; nada de SVG/layout por frame):
 * âncora fixa na borda do card → gira até o hotspot; o comprimento entra como scaleX da linha
 * (relativo ao comprimento-base) e a ponta fica na borda do anel, apontando para a peça.
 */
export function aimLeader(l: Leader, anchor: { x: number; y: number }, hx: number, hy: number) {
  const vx = hx - anchor.x, vy = hy - anchor.y;
  const len = Math.hypot(vx, vy) - LIVING.ringR;
  l.el.style.transform = `translate3d(${anchor.x.toFixed(2)}px, ${anchor.y.toFixed(2)}px, 0) rotate(${Math.atan2(vy, vx).toFixed(5)}rad)`;
  l.len.style.transform = `scaleX(${(len / l.base).toFixed(5)})`;
  l.head.style.transform = `translate3d(${(len - LIVING.headTip.x).toFixed(2)}px, ${(-LIVING.headTip.y).toFixed(2)}px, 0)`;
}

type Opts = {
  root: HTMLElement;
  focusAt: (y: number) => ServiceId | null;
  lifeAt: (y: number) => number;       // 1 = vivo; 0 = parado (fechamento)
  activeLayers: Record<ServiceId, LayerId[]>;
  ui: Record<ServiceId, FocusUi>;
};

const TAU = Math.PI * 2;

export function startLiving({ root, focusAt, lifeAt, activeLayers, ui }: Opts) {
  const activeMult = MOTION_RULES.active_piece_float_multiplier;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const L = LAYER_ORDER.map((id, i) => {
    const m = MOTION[id];
    return {
      id,
      float: root.querySelector<HTMLElement>(`[data-float="${id}"]`)!,
      pointer: root.querySelector<HTMLElement>(`[data-pointer="${id}"]`)!,
      // valores do mapa = px do próprio layer (canvas 941×1672): no hero mobile (0,39×) = 1–4 px de tela.
      // (Como px de tela, ×2,56, as frestas entre os recortes poligonais abriam visivelmente.)
      fx: m.floatX, fy: m.floatY, fr: m.rotate,
      mx: m.mouseX, my: m.mouseY,
      tx: m.duration, ty: m.duration * 1.31, tr: m.duration * 1.73, // períodos distintos → sem sincronia artificial
      ph: i * 1.618,
      amp: 1,
      x: 0, y: 0,                 // flutuação atual (px do layer)
      px: 0, py: 0,               // parallax atual (suavizado)
      wx: NaN, wy: NaN,           // último parallax escrito
    };
  });
  const byId = Object.fromEntries(L.map((l) => [l.id, l])) as Record<LayerId, (typeof L)[number]>;
  // peça ativa por foco, pré-calculado (nada de includes() por layer a cada frame)
  const isActive = Object.fromEntries(
    (Object.keys(activeLayers) as ServiceId[]).map((s) => [s, L.map((l) => activeLayers[s].includes(l.id))]),
  ) as Record<ServiceId, boolean[]>;
  const none = L.map(() => false);

  // um único listener para o hero inteiro; cursor normalizado em -1..1 pela viewport (sem getBoundingClientRect)
  let nx = 0, ny = 0;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    nx = (e.clientX / window.innerWidth) * 2 - 1;
    ny = (e.clientY / window.innerHeight) * 2 - 1;
  };
  const onLeave = () => { nx = 0; ny = 0; };
  if (finePointer) {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
  }

  // posição de scroll em cache: lida no evento de scroll (início do frame, layout limpo), nunca dentro do tick —
  // lá ela vinha depois de escritas de estilo do mesmo frame e forçava recálculo (0,3–0,8 ms/frame medidos)
  let scrollY = window.scrollY;
  const onScroll = () => { scrollY = window.scrollY; };
  window.addEventListener("scroll", onScroll, { passive: true });

  const follow = Object.fromEntries((Object.keys(ui) as ServiceId[]).map((s) => [s, { lx: NaN, ly: NaN }])) as Record<ServiceId, { lx: number; ly: number }>;
  let idle = false;
  let t0 = -1;

  const tick = (time: number, dt: number) => {
    if (t0 < 0) t0 = time;
    const t = time - t0;
    const life = lifeAt(scrollY);
    const focus = focusAt(scrollY);
    const act = focus ? isActive[focus] : none;
    const s = dt / 1000;
    const k = 1 - Math.exp(-s * LIVING.ampRate);
    const kp = 1 - Math.exp(-s * LIVING.pointerRate);

    // fechamento concluído: vida parada → zera uma vez e não escreve mais nada (ticker ocioso)
    if (life === 0 && L.every((l) => l.amp < 0.002)) {
      if (!idle) {
        idle = true;
        for (const l of L) {
          l.amp = l.x = l.y = l.px = l.py = 0;
          l.float.style.transform = "translate3d(0px, 0px, 0) rotate(0deg)";
          if (finePointer) { l.pointer.style.transform = "translate3d(0px, 0px, 0)"; l.wx = l.wy = 0; }
        }
      }
      return;
    }
    idle = false;

    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      l.amp += (life * (act[i] ? activeMult : 1) - l.amp) * k;
      const a = l.amp;
      l.x = a * l.fx * Math.sin((TAU * t) / l.tx + l.ph);
      l.y = a * l.fy * Math.sin((TAU * t) / l.ty + l.ph * 0.7);
      const r = a * l.fr * Math.sin((TAU * t) / l.tr + l.ph * 1.3);
      l.float.style.transform = `translate3d(${l.x.toFixed(2)}px, ${l.y.toFixed(2)}px, 0) rotate(${r.toFixed(3)}deg)`;
      if (finePointer) {
        // mesma amplitude da vida: o parallax some no fechamento
        l.px += (nx * l.mx * a - l.px) * kp;
        l.py += (ny * l.my * a - l.py) * kp;
        if (Math.abs(l.px - l.wx) > 0.01 || Math.abs(l.py - l.wy) > 0.01 || Number.isNaN(l.wx)) {
          l.pointer.style.transform = `translate3d(${l.px.toFixed(2)}px, ${l.py.toFixed(2)}px, 0)`;
          l.wx = l.px; l.wy = l.py;
        }
      }
    }

    // hotspot + início da seta acompanham a peça ativa (foco nunca desalinha)
    if (focus) {
      const u = ui[focus];
      const l = byId[u.layer];
      const cx = l.x + l.px, cy = l.y + l.py;
      const ang = (u.camera.rotation * Math.PI) / 180;
      const dx = u.camera.scale * (cx * Math.cos(ang) - cy * Math.sin(ang));
      const dy = u.camera.scale * (cx * Math.sin(ang) + cy * Math.cos(ang));
      const f = follow[focus];
      if (Math.abs(dx - f.lx) > 0.05 || Math.abs(dy - f.ly) > 0.05 || Number.isNaN(f.lx)) {
        f.lx = dx; f.ly = dy;
        u.follow.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
        aimLeader(u.leader, u.anchor, u.hs.x + dx, u.hs.y + dy);
      }
    }
  };
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    window.removeEventListener("scroll", onScroll);
    if (finePointer) {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    }
  };
}
