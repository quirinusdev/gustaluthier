import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  FOCUS_ZONES, LAYER_ORDER, activeLayersOf, getShots, isWide,
  layerState, pointOnLayer, project,
  type Camera, type Label, type LayerId, type ServiceId, type Shot,
} from "./scene";
import { startLiving, type FocusUi } from "./living";

const SERVICES: ServiceId[] = ["regulagem", "manutencao", "customizacao"];
const ORDER: Label[] = ["intro", "contexto", "regulagem", "manutencao", "customizacao", "credibilidade", "orcamento", "cta"];

const clamp = (min: number, max: number, v: number) => Math.min(max, Math.max(min, v));

/**
 * Monta a narrativa sobre o DOM já renderizado.
 * Timeline única, scrubbed, em que 1 unidade de tempo = 1px de scroll:
 * as labels caem exatamente na posição de cada seção → determinística e reversível.
 * motion=false (prefers-reduced-motion): mesmos estados, aplicados sem animação.
 */
export function buildNarrative(root: HTMLElement, motion: boolean, assetsReady = true): (() => void) | void {
  const q = gsap.utils.selector(root);
  const one = <T extends Element = HTMLElement>(sel: string) => q(sel)[0] as unknown as T;

  const vw = document.documentElement.clientWidth;
  const vh = one(".panel-sticky").offsetHeight; // 100svh real
  const wide = isWide(vw, vh);
  const shots = getShots(vw, vh);

  const rig = one(".rig");
  const dim = one(".dim");
  const shadeTop = one(".shade-top");
  const shadeBottom = one(".shade-bottom");
  const shadeFull = one(".shade-full");
  // wrappers da etapa exploded (guitarra/peças e setas/hotspots): fade de saída único e limpo
  const exploded = q(".exploded-stage");
  // .part-scroll de cada layer (z-index do JSON); todos começam em transform identity
  const layers = LAYER_ORDER.map((id) => ({ id, el: one(`[data-layer="${id}"]`) }));
  const layerEl = (id: LayerId) => layers.find((l) => l.id === id)!.el;
  const seamEl = (id: LayerId) => one(`[data-seam="${id}"]`);
  const imageEl = (id: LayerId) => one(`[data-image="${id}"]`);
  const rim = (sv: ServiceId, on: boolean) => ({ attr: { "data-active": on ? "1" : "0" } });
  /** costura visível só quando a peça está "em casa" (deslocamentos pequenos da flutuação);
   *  some na peça ativa (ênfase grande) e na montagem, para não arrastar faixa-fantasma. */
  const seamVars = (shot: Shot, id: LayerId) => ({
    opacity: shot.focus && activeLayersOf(shot.focus).includes(id) ? 0 : 1,
  });
  const glows = Object.fromEntries(SERVICES.map((sv) => [sv, q(`[data-glow="${sv}"]`)])) as unknown as Record<ServiceId, Element[]>;

  /* ---------- estados ---------- */
  // foco = só ênfase (transform do JSON + opacidade das demais); o exploded nunca remonta
  // no fechamento (cta) as peças convergem para o eixo da guitarra
  const layerVars = (shot: Shot, id: LayerId) => layerState(shot.focus, id);
  const stageVars = (shot: Shot) => ({
    dim: { opacity: shot.dim },
    top: { opacity: shot.shadeTop },
    bottom: { opacity: shot.shadeBottom },
    full: { opacity: shot.shadeFull },
    hero: { autoAlpha: shot.hero, scale: shot.hero ? 1 : 0.98 }, // etapa exploded inteira (some no fechamento)
  });

  /* ---------- hotspots, cards e linhas (coordenadas de viewport) ---------- */
  const headBottom = (() => {
    const h = one(".services-head");
    return h.offsetTop + h.offsetHeight;
  })();
  const ui: Record<ServiceId, { hs: HTMLElement; card: HTMLElement; line: SVGPathElement }> = {} as never;
  const live: Record<ServiceId, FocusUi> = {} as never;
  SERVICES.forEach((id) => {
    const hsPt = shots[id].hotspot!;
    const hs = one(`[data-hotspot="${id}"]`);
    const card = one(`[data-card="${id}"]`);
    const line = one<SVGPathElement>(`[data-line="${id}"]`);
    const w = card.offsetWidth, h = card.offsetHeight, m = 16;
    let x: number, y: number;
    // regiões técnicas em foco, já com o transform de ênfase, projetadas na viewport
    const cam = shots[id].camera;
    const R = wide ? 80 : 58;
    const zones = FOCUS_ZONES[id].map((z) => {
      const c = project(cam, pointOnLayer(id, z.layer, z.at));
      return { l: c.x - R, r: c.x + R, t: c.y - R, b: c.y + R };
    });
    if (wide) {
      // card à esquerda das regiões em foco (nunca sobre o instrumento ativo)
      // …e na coluna de conteúdo (≤ 40% da largura), fora da composição exploded
      x = Math.min(hsPt.x - w - 120, Math.min(...zones.map((z) => z.l)) - w - 36, 0.4 * vw - w);
      y = hsPt.y - h / 2;
    } else {
      const toLeft = hsPt.x > vw / 2;
      x = toLeft ? m : vw - m - w;
      const dy = { regulagem: 36, manutencao: -h - 64, customizacao: 72 }[id];
      y = hsPt.y + dy;
    }
    x = clamp(m, vw - w - m, x);
    y = clamp(headBottom + 16, vh - h - 24, y);
    const hits = (yy: number) => zones.some((z) => !(x + w < z.l || x > z.r || yy + h < z.t || yy > z.b));
    if (hits(y)) {
      // o card nunca cobre a região em foco: sobe acima dela ou desce abaixo
      const above = Math.min(...zones.map((z) => z.t)) - h - 12;
      const below = Math.max(...zones.map((z) => z.b)) + 12;
      y = above >= headBottom + 16 ? above : clamp(headBottom + 16, vh - h - 24, below);
    }
    gsap.set(hs, { x: hsPt.x, y: hsPt.y, xPercent: -50, yPercent: -50, autoAlpha: 0 });
    gsap.set(card, { x, y, autoAlpha: 0 });
    // linha: do anel do hotspot até a borda vertical mais próxima do card
    const ax = x + w / 2 < hsPt.x ? x + w : x;
    const ay = clamp(y + 18, y + h - 18, hsPt.y);
    const a = Math.atan2(ay - hsPt.y, ax - hsPt.x);
    const r = 17;
    line.setAttribute("d", `M${(hsPt.x + Math.cos(a) * r).toFixed(1)},${(hsPt.y + Math.sin(a) * r).toFixed(1)} L${ax.toFixed(1)},${ay.toFixed(1)}`);
    gsap.set(line, { strokeDasharray: 1, strokeDashoffset: 1, autoAlpha: 0 });
    ui[id] = { hs, card, line };
    live[id] = {
      layer: FOCUS_ZONES[id][0].layer, camera: cam, hs: hsPt, anchor: { x: ax, y: ay },
      follow: hs.querySelector<HTMLElement>(".hotspot-follow")!, line,
    };
  });

  /* ---------- Fechamento: a guitarra mantém o enquadramento da última etapa (orçamento) e só some ---------- */
  shots.cta.camera = shots.orcamento.camera;

  /* ---------- aplicar um estado instantaneamente ---------- */
  const apply = (label: Label) => {
    const s = shots[label];
    gsap.set(rig, { ...s.camera, transformOrigin: "0 0", force3D: true });
    const l = stageVars(s);
    gsap.set(dim, l.dim); gsap.set(shadeTop, l.top); gsap.set(shadeBottom, l.bottom); gsap.set(shadeFull, l.full);
    gsap.set(exploded, l.hero);
    layers.forEach((ly) => { gsap.set(ly.el, { ...layerVars(s, ly.id), force3D: true }); gsap.set(seamEl(ly.id), seamVars(s, ly.id)); });
    SERVICES.forEach((id) => {
      const on = s.focus === id;
      gsap.set([ui[id].hs, ui[id].card, ui[id].line], { autoAlpha: on ? 1 : 0 });
      gsap.set(ui[id].line, { strokeDashoffset: on ? 0 : 1 });
      gsap.set(glows[id], { opacity: on ? 1 : 0, scale: on ? 1 : 0.85 });
      activeLayersOf(id).forEach((ly) => gsap.set(imageEl(ly), rim(id, on && s.focus === id)));
    });
  };
  apply("intro");
  // Assets do hero ainda decodificando: só o estado inicial; o ScrollTrigger nasce depois
  if (!assetsReady) return;

  /* ---------- posições (px de scroll) ---------- */
  const top = (sel: string) => one(sel).offsetTop;
  const max = ScrollTrigger.maxScroll(window);
  const tAbout = top("#quem-somos");
  const tSvc = top("#servicos");
  const svcHold = one("#servicos").offsetHeight - vh;
  const tCred = top("#trabalho");
  const tOrc = top("#orcamento");
  // fechamento ancorado no fim do #orcamento (onde a seção final começava): mesmos px aprovados,
  // independente do painel do formulário que agora sobrepõe esse trecho
  const tCta = Math.min(top("#orcamento") + one("#orcamento").offsetHeight, max);

  const seg: Record<Exclude<Label, "intro">, [number, number]> = {
    contexto: [tAbout - vh * 0.9, vh * 0.9],
    regulagem: [tSvc - vh * 0.9, vh * 0.9],
    manutencao: [tSvc + svcHold * 0.24, svcHold * 0.17],
    customizacao: [tSvc + svcHold * 0.6, svcHold * 0.17],
    credibilidade: [tSvc + svcHold, tCred - tSvc - svcHold],
    orcamento: [tOrc - vh, vh * 0.8],
    cta: [tCta - vh * 0.9, vh * 0.9],
  };

  if (!motion) {
    // Reduced motion: troca de estado discreta, sem movimento
    ORDER.slice(1).forEach((label, i) => {
      const [s, d] = seg[label as Exclude<Label, "intro">];
      ScrollTrigger.create({
        start: s + d / 2,
        end: "max",
        onEnter: () => apply(label),
        onLeaveBack: () => apply(ORDER[i]),
      });
    });
    return;
  }

  // ease "none" em tudo que é ligado ao scroll: a suavidade vem só do scrub
  const tl = gsap.timeline({ defaults: { ease: "none", force3D: true } });
  const u = vh; // atalho legível: frações de viewport

  // Copy das telas presas (entra/sai com o scroll + opacidade)
  tl.to(q(".intro-copy"), { autoAlpha: 0, duration: 0.45 * u }, 0.2 * tAbout);
  tl.fromTo(q(".about-copy, .instruments"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 * u }, tAbout - 0.5 * u);
  tl.to(q(".about-copy, .instruments"), { autoAlpha: 0, duration: 0.4 * u }, tSvc - 0.85 * u);
  tl.fromTo(q(".services-head"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 * u }, tSvc - 0.45 * u);

  (Object.keys(seg) as Exclude<Label, "intro">[]).forEach((label) => {
    const [start, dur] = seg[label];
    const s = shots[label];
    const end = start + dur;
    const prev = ORDER[ORDER.indexOf(label) - 1];
    const p = shots[prev];
    const l = stageVars(s);
    const lp = stageVars(p);
    // fromTo com valores explícitos (estado da label anterior → atual): o GSAP não lê o DOM
    // durante o scroll (sem style/layout forçado na 1ª passagem) e a coreografia é a mesma.
    const ft = (el: Element, from: gsap.TweenVars, to: gsap.TweenVars, d: number, at: number) =>
      tl.fromTo(el, from, { ...to, duration: d, immediateRender: false }, at);

    // 5. atenuar foco anterior (sai primeiro para não "flutuar" durante o movimento)
    const prevFocus = shots[prev].focus;
    if (prevFocus) {
      tl.to([ui[prevFocus].card, ui[prevFocus].hs, ui[prevFocus].line], { autoAlpha: 0, duration: 0.12 * u }, start);
      tl.fromTo(glows[prevFocus], { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.85, duration: 0.12 * u, immediateRender: false }, start);
      activeLayersOf(prevFocus).forEach((ly) => tl.set(imageEl(ly), rim(prevFocus, false), start));
    }
    // 1. câmera / enquadramento (no fechamento, até o "match" com a guitarra montada)
    if (label !== "cta") {
      ft(rig, p.camera, s.camera, dur, start);
      ft(dim, lp.dim, l.dim, dur * 0.7, start);
      ft(shadeTop, lp.top, l.top, dur * 0.6, start + dur * 0.2);
      ft(shadeBottom, lp.bottom, l.bottom, dur * 0.6, start + dur * 0.2);
      ft(shadeFull, lp.full, l.full, dur * 0.6, start + dur * 0.2);
    } else {
      // véus só mudam depois que a guitarra já sumiu (ela não "acende" antes de sair)
      ft(dim, lp.dim, l.dim, dur * 0.06, start + dur * 0.94);
      ft(shadeTop, lp.top, l.top, dur * 0.06, start + dur * 0.94);
      ft(shadeBottom, lp.bottom, l.bottom, dur * 0.06, start + dur * 0.94);
      ft(shadeFull, lp.full, l.full, dur * 0.06, start + dur * 0.94);
    }
    // 2. destacar a região ativa (ênfase do JSON); as demais seguem exploded, com menos destaque
    if (label !== "cta") {
      layers.forEach((ly) => {
        ft(ly.el, layerVars(p, ly.id), layerVars(s, ly.id), dur * 0.65, start + dur * 0.3);
        // a costura sai logo no início do deslocamento da ênfase e volta só quando a peça já retornou
        const sp = seamVars(p, ly.id).opacity, ss = seamVars(s, ly.id).opacity;
        if (sp !== ss) ft(seamEl(ly.id), { opacity: sp }, { opacity: ss }, dur * 0.12, start + dur * (ss ? 0.85 : 0.3));
      });
    } else {
      // SAÍDA: mantém posição e escala da última etapa e some por inteiro (guitarra, peças, setas, hotspots).
      // autoAlpha 1 → 0 (visibility: hidden no fim) e scale 1 → 0,98. O formulário entra em 0,78·cD (crossfade).
      tl.fromTo(exploded, lp.hero, { ...l.hero, duration: dur * 0.2, ease: "power2.inOut", immediateRender: false }, start + dur * 0.74);
    }
    // 3. hotspot → 4. linha + card
    if (s.focus) {
      const f = ui[s.focus];
      // glow atrás da peça ativa acende antes do hotspot (peça → hotspot → seta → card)
      tl.fromTo(glows[s.focus], { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.14 * u, immediateRender: false }, end - 0.1 * u);
      activeLayersOf(s.focus).forEach((ly) => tl.set(imageEl(ly), rim(s.focus!, true), end - 0.1 * u));
      tl.to(f.hs, { autoAlpha: 1, duration: 0.08 * u }, end - 0.04 * u);
      tl.set(f.line, { autoAlpha: 1 }, end + 0.02 * u);
      tl.to(f.line, { strokeDashoffset: 0, duration: 0.1 * u }, end + 0.02 * u);
      tl.to(f.card, { autoAlpha: 1, duration: 0.1 * u }, end + 0.08 * u);
    }
    tl.addLabel(label, end);
  });
  /* ---------- FORMULÁRIO: crossfade com o fim do exploded, na MESMA timeline e área pinned ----------
   * O fade do exploded começa em cS + 0,74·cD; o formulário entra logo depois (0,78·cD) e se sobrepõe a ele.
   * Termina em tCta + 0,12·vh, antes de o pin do painel liberar (tCta + 0,3·vh). */
  {
    const [cS, cD] = seg.cta;
    const e0 = cS + cD * 0.78;
    const head = q("#contato .display, #contato .kicker");
    const box = one(".quote-form");
    const fields = q(".quote-form .qf-field");
    const btn = one(".qf-submit");
    gsap.set([...head, box], { autoAlpha: 0, y: 45, scale: 0.98 });
    gsap.set(fields, { autoAlpha: 0, y: 18 });
    gsap.set(btn, { autoAlpha: 0, y: 16, scale: 0.98 });
    const fin = (d: number) => ({ autoAlpha: 1, y: 0, scale: 1, duration: d * u, ease: "power2.out", immediateRender: false });
    head.forEach((el, i) => tl.fromTo(el, { autoAlpha: 0, y: 45, scale: 0.98 }, fin(0.14), e0 + i * 0.03 * u));
    tl.fromTo(box, { autoAlpha: 0, y: 45, scale: 0.98 }, fin(0.14), e0 + 0.04 * u);
    fields.forEach((el, i) =>
      tl.fromTo(el, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.1 * u, ease: "power2.out", immediateRender: false }, e0 + (0.08 + i * 0.035) * u));
    tl.fromTo(btn, { autoAlpha: 0, y: 16, scale: 0.98 }, fin(0.1), e0 + 0.22 * u);
  }
  tl.addLabel("intro", 0);
  tl.call(() => {}, [], max); // duração = altura rolável → tempo == px (marcador sem alvo DOM)

  // Pré-inicializa todos os tweens agora (no load, hero já pintado), e não no meio do gesto:
  // percorre fim → início de forma síncrona (sem pintura entre os dois → sem piscada).
  tl.progress(1, true).progress(0, true);

  ScrollTrigger.create({
    id: "narrative",
    animation: tl,
    start: 0,
    end: max,
    scrub: 0.55, // resposta mais imediata, ainda cinematográfica (auditoria v2: 0.45–0.65)
  });

  // VIDA: flutuação contínua + parallax do mouse em wrappers próprios (nunca nos elementos do scroll)
  const hold: Record<ServiceId, [number, number]> = {
    regulagem: [seg.regulagem[0] + seg.regulagem[1] - 0.1 * u, seg.manutencao[0]],
    manutencao: [seg.manutencao[0] + seg.manutencao[1] - 0.1 * u, seg.customizacao[0]],
    customizacao: [seg.customizacao[0] + seg.customizacao[1] - 0.1 * u, seg.credibilidade[0]],
  };
  const [cS, cD] = seg.cta;
  const stopLiving = startLiving({
    root,
    activeLayers: { regulagem: activeLayersOf("regulagem"), manutencao: activeLayersOf("manutencao"), customizacao: activeLayersOf("customizacao") },
    ui: live,
    focusAt: (y) => SERVICES.find((sv) => y >= hold[sv][0] && y < hold[sv][1]) ?? null,
    // fechamento: a flutuação segue viva e para junto com o fade de saída (0,74 → 0,94 do segmento)
    lifeAt: (y) => {
      const t = clamp(0, 1, (y - (cS + cD * 0.74)) / (cD * 0.2));
      return 1 - t * t * (3 - 2 * t);
    },
  });

  // O hero já nasce exploded (layers em identity) — o load só revela a copy; o scroll não inicia a explosão
  if (window.scrollY < 40) {
    // headline (LCP) entra só com deslocamento — nunca a partir de opacidade 0
    gsap.from(q(".intro-copy h1 .reveal"), { y: 14, duration: 0.9, ease: "power2.out", stagger: 0.06 });
    gsap.from(q(".intro-copy > .reveal"), { autoAlpha: 0, y: 18, duration: 0.9, ease: "power2.out", stagger: 0.08, delay: 0.3 });
  }
  return stopLiving;
}
