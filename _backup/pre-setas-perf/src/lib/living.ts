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
 *   - fechamento: → 0 antes da montagem.
 */
export type FocusUi = {
  layer: LayerId;
  camera: Camera;
  hs: { x: number; y: number };       // centro do hotspot (viewport, sem flutuação)
  anchor: { x: number; y: number };   // ponto do card onde a seta termina
  follow: HTMLElement;                 // wrapper do ring que acompanha a peça
  line: SVGPathElement;
};

type Opts = {
  root: HTMLElement;
  focusAt: (y: number) => ServiceId | null;
  lifeAt: (y: number) => number;       // 1 = vivo; 0 = parado (montagem)
  activeLayers: Record<ServiceId, LayerId[]>;
  ui: Record<ServiceId, FocusUi>;
};

const RING_R = 17;
const TAU = Math.PI * 2;

export function startLiving({ root, focusAt, lifeAt, activeLayers, ui }: Opts) {
  const q = gsap.utils.selector(root);
  const activeMult = MOTION_RULES.active_piece_float_multiplier;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const L = LAYER_ORDER.map((id, i) => {
    const m = MOTION[id];
    const float = q(`[data-float="${id}"]`)[0] as HTMLElement;
    const pointer = q(`[data-pointer="${id}"]`)[0] as HTMLElement;
    return {
      id,
      // valores do mapa = px do próprio layer (canvas 941×1672): no hero mobile (0,39×) = 1–4 px de tela.
      // (Como px de tela, ×2,56, as frestas entre os recortes poligonais abriam visivelmente.)
      fx: m.floatX, fy: m.floatY, fr: m.rotate,
      mx: m.mouseX, my: m.mouseY,
      tx: m.duration, ty: m.duration * 1.31, tr: m.duration * 1.73, // períodos distintos → sem sincronia artificial
      ph: i * 1.618,
      amp: 1,
      setX: gsap.quickSetter(float, "x", "px"),
      setY: gsap.quickSetter(float, "y", "px"),
      setR: gsap.quickSetter(float, "rotation", "deg"),
      toX: finePointer ? gsap.quickTo(pointer, "x", { duration: 0.9, ease: "power3.out" }) : null,
      toY: finePointer ? gsap.quickTo(pointer, "y", { duration: 0.9, ease: "power3.out" }) : null,
      pointer,
      last: { x: 0, y: 0, px: NaN, py: NaN },
    };
  });
  const byId = Object.fromEntries(L.map((l) => [l.id, l])) as Record<LayerId, (typeof L)[number]>;

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

  const followSet = Object.fromEntries(
    (Object.keys(ui) as ServiceId[]).map((s) => [s, { x: gsap.quickSetter(ui[s].follow, "x", "px"), y: gsap.quickSetter(ui[s].follow, "y", "px"), lx: NaN, ly: NaN }]),
  ) as Record<ServiceId, { x: (v: number) => void; y: (v: number) => void; lx: number; ly: number }>;

  let t0 = -1;
  const tick = (time: number, dt: number) => {
    if (t0 < 0) t0 = time;
    const t = time - t0;
    const y = window.scrollY; // leitura barata (sem layout)
    const life = lifeAt(y);
    const focus = focusAt(y);
    const active = focus ? activeLayers[focus] : [];
    const k = 1 - Math.exp(-(dt / 1000) * 3.2); // suavização da amplitude independente do fps

    // montagem concluída: vida parada → zera uma vez e não escreve mais nada (ticker ocioso)
    if (life === 0 && L.every((l) => l.amp < 0.002)) {
      if (L[0].amp !== 0) for (const l of L) { l.amp = 0; l.setX(0); l.setY(0); l.setR(0); l.toX?.(0); l.toY?.(0); l.last.px = 0; l.last.py = 0; }
      return;
    }
    for (const l of L) {
      const target = life * (active.includes(l.id) ? activeMult : 1);
      l.amp += (target - l.amp) * k;
      const a = l.amp;
      const x = a * l.fx * Math.sin((TAU * t) / l.tx + l.ph);
      const yy = a * l.fy * Math.sin((TAU * t) / l.ty + l.ph * 0.7);
      l.setX(x); l.setY(yy); l.setR(a * l.fr * Math.sin((TAU * t) / l.tr + l.ph * 1.3));
      l.last.x = x; l.last.y = yy;
      if (l.toX && l.toY) {
        const px = nx * l.mx * a, py = ny * l.my * a; // mesma amplitude da vida: some na montagem
        if (Math.abs(px - l.last.px) > 0.2 || Math.abs(py - l.last.py) > 0.2 || Number.isNaN(l.last.px)) {
          l.toX(px); l.toY(py); l.last.px = px; l.last.py = py;
        }
      }
    }

    // hotspot + início da seta acompanham a peça ativa (foco nunca desalinha)
    if (focus) {
      const u = ui[focus];
      const l = byId[u.layer];
      const cx = l.last.x + (gsap.getProperty(l.pointer, "x") as number);
      const cy = l.last.y + (gsap.getProperty(l.pointer, "y") as number);
      const a = (u.camera.rotation * Math.PI) / 180;
      const dx = u.camera.scale * (cx * Math.cos(a) - cy * Math.sin(a));
      const dy = u.camera.scale * (cx * Math.sin(a) + cy * Math.cos(a));
      const f = followSet[focus];
      if (Math.abs(dx - f.lx) > 0.15 || Math.abs(dy - f.ly) > 0.15 || Number.isNaN(f.lx)) {
        f.x(dx); f.y(dy); f.lx = dx; f.ly = dy;
        const hx = u.hs.x + dx, hy = u.hs.y + dy;
        const ang = Math.atan2(u.anchor.y - hy, u.anchor.x - hx);
        u.line.setAttribute("d", `M${(hx + Math.cos(ang) * RING_R).toFixed(1)},${(hy + Math.sin(ang) * RING_R).toFixed(1)} L${u.anchor.x.toFixed(1)},${u.anchor.y.toFixed(1)}`);
      }
    }
  };
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("blur", onLeave);
  };
}
