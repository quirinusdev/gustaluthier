"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CONTENT } from "@/lib/content";
import { IconPlay } from "./Icons";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* Assets oficiais: Gusta_Resultados_Assets_v1 (01_VIDEOS + 02_POSTERS), copiados sem alteração. */
const DIR = "/assets/resultados";
const ITEMS = [
  { video: `${DIR}/resultado_01_guitarra_creme_vertical.mp4`, poster: `${DIR}/resultado_01_poster.jpg` },
  { video: `${DIR}/resultado_02_violao_claro_vertical.mp4`, poster: `${DIR}/resultado_02_poster.jpg` },
  { video: `${DIR}/resultado_03_violao_mogno_vertical.mp4`, poster: `${DIR}/resultado_03_poster.jpg` },
];
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Mini-sequência pinned (em unidades de viewport, a partir do topo da seção no fundo da tela):
 *  0,25 → 0,75  entrada (título, card, progresso), junto com a seção subindo
 *  1,75 / 2,50  troca do card ativo (crossfade curto + translateY pequeno)
 *  3,28 → 3,46  saída, sobreposta à entrada do formulário (crossfade, sem zona morta)
 *  3,52         fim da trilha = o pin libera
 * Seção 260svh + trilha que transborda 92svh por baixo do painel do formulário (que já sobrepõe 90svh),
 * para o card continuar preso até o crossfade. A narrativa do exploded não muda: ela só lê o início e o fim da seção.
 */
const SPAN = 3.52;
const SWITCH = [1.75, 2.5];
const GOTO = [1.2, 2.1, 2.85]; // ponto de rolagem de cada card (dots / arrastar)
const LIVE: [number, number] = [0.5, 3.46]; // vídeo ativo só reproduz dentro deste trecho

export default function ResultsSection() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(-1);
  const [needsTap, setNeedsTap] = useState<boolean[]>([false, false, false]);
  const [stacked, setStacked] = useState(false);
  const api = useRef<{ go: (i: number) => void; toggle: (i: number) => void }>({ go: () => {}, toggle: () => {} });
  const c = CONTENT.results;

  useGSAP(
    () => {
      const sec = root.current!;
      const track = sec.querySelector<HTMLElement>(".results-track")!;
      const pin = sec.querySelector<HTMLElement>(".results-pin")!;
      const cards = gsap.utils.toArray<HTMLElement>(".result-card", sec);
      const videos = cards.map((el) => el.querySelector("video")!);
      const parts = gsap.utils.toArray<HTMLElement>(".results-head, .results-stage, .results-foot", sec);

      // carregamento progressivo: poster ao se aproximar; src só do card ativo (+ o próximo, só metadata)
      const posters = () => videos.forEach((v, i) => { if (!v.poster) v.poster = ITEMS[i].poster; });
      const source = (i: number) => {
        const v = videos[i];
        if (v && !v.getAttribute("src")) { v.src = ITEMS[i].video; v.load(); }
      };
      const mark = (i: number, on: boolean) => setNeedsTap((n) => (n[i] === on ? n : n.map((x, k) => (k === i ? on : x))));

      // Fumaça de fundo: enquanto um resultado reproduz, ela fica parada no quadro atual (sem reiniciar) e volta
      // do mesmo ponto depois. Dois vídeos decodificando juntos derrubavam o scroll de 60 para 30 fps (DevTools).
      const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const smoke = () => document.querySelector<HTMLVideoElement>(".hero-bg video");
      let heldSmoke = false;
      let resumeT = 0;
      const holdSmoke = () => {
        clearTimeout(resumeT);
        const s = smoke();
        if (s && !s.paused) { s.pause(); heldSmoke = true; }
      };
      const releaseSmoke = () => {
        clearTimeout(resumeT);
        resumeT = window.setTimeout(() => {
          if (!heldSmoke || videos.some((v) => !v.paused)) return;
          heldSmoke = false;
          if (!document.hidden && !reduceMq.matches) smoke()?.play().catch(() => {});
        }, 250); // troca de card (pause → play) não religa a fumaça no meio
      };

      // um vídeo por vez: qualquer play pausa os demais
      const onPlay = (e: Event) => {
        const i = videos.indexOf(e.target as HTMLVideoElement);
        videos.forEach((v, k) => k !== i && !v.paused && v.pause());
        holdSmoke();
        setPlaying(i);
        mark(i, false);
      };
      const onPause = (e: Event) => {
        setPlaying((p) => (p === videos.indexOf(e.target as HTMLVideoElement) ? -1 : p));
        releaseSmoke();
      };
      videos.forEach((v) => {
        v.muted = true; v.defaultMuted = true; // iOS: autoplay só com muted como propriedade
        v.addEventListener("play", onPlay);
        v.addEventListener("pause", onPause);
      });
      const play = (i: number, restart: boolean) => {
        source(i);
        const v = videos[i];
        if (restart) { try { v.currentTime = 0; } catch { /* metadata ainda não carregou */ } }
        v.play().catch(() => mark(i, true)); // autoplay bloqueado → mostra o botão de play
        if (i + 1 < ITEMS.length) source(i + 1); // próximo: só metadata (preload="metadata"), nunca os três inteiros
      };
      const pauseAll = () => videos.forEach((v) => !v.paused && v.pause());
      const userPaused = new Set<number>();

      const near = ScrollTrigger.create({ trigger: sec, start: "top bottom+=150%", end: "max", onEnter: posters });
      const mm = gsap.matchMedia();

      mm.add({ motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        if (ctx.conditions?.reduce) {
          // sem pin nem transições: cards em fluxo normal, vídeos acionáveis por toque
          sec.classList.add("is-static");
          setStacked(true);
          setNeedsTap([true, true, true]);
          api.current.toggle = (i) => {
            const v = videos[i];
            if (v.paused) play(i, false); else { v.pause(); mark(i, true); }
          };
          api.current.go = (i) => cards[i].scrollIntoView({ block: "center" });
          const off = ScrollTrigger.create({ trigger: sec, start: "top bottom", end: "bottom top", onToggle: (s) => !s.isActive && pauseAll() });
          return () => { off.kill(); pauseAll(); sec.classList.remove("is-static"); setStacked(false); setNeedsTap([false, false, false]); };
        }

        let idx = -1;
        let live = false;
        gsap.set(cards, { autoAlpha: 0, y: 0 });
        gsap.set(cards[0], { autoAlpha: 1 });

        const show = (to: number, from: number) => {
          const dir = to > from ? 1 : -1;
          if (from >= 0) gsap.to(cards[from], { autoAlpha: 0, y: -14 * dir, duration: 0.32, ease: "power2.out", overwrite: true });
          gsap.fromTo(cards[to], { autoAlpha: 0, y: 14 * dir }, { autoAlpha: 1, y: 0, duration: 0.42, delay: 0.06, ease: "power2.out", overwrite: true });
        };
        const update = (o: number) => {
          const i = o < SWITCH[0] ? 0 : o < SWITCH[1] ? 1 : 2;
          const l = o > LIVE[0] && o < LIVE[1];
          if (i !== idx) {
            const from = idx;
            idx = i;
            setActive(i);
            if (from >= 0) show(i, from); else { gsap.set(cards, { autoAlpha: 0 }); gsap.set(cards[i], { autoAlpha: 1, y: 0 }); }
            userPaused.clear();
            videos.forEach((v, k) => k !== i && !v.paused && v.pause()); // perdeu o foco → pause imediato
            if (l) play(i, true);
          } else if (l && !live && !userPaused.has(i)) play(i, true);
          if (!l && live) pauseAll();
          live = l;
        };

        // entrada / saída scrubbed (mesmo scrub da narrativa); 1 unidade = 1 viewport
        const tl = gsap.timeline({ defaults: { ease: "none" } });
        tl.fromTo(parts, { autoAlpha: 0, y: 24, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" }, 0.25);
        tl.fromTo(parts, { autoAlpha: 1, y: 0, scale: 1 }, { autoAlpha: 0, y: -24, scale: 0.985, duration: 0.18, ease: "power2.inOut", immediateRender: false }, 3.28);
        tl.set({}, {}, SPAN);

        const st = ScrollTrigger.create({
          trigger: track,
          start: "top bottom",
          end: "bottom bottom",
          animation: tl,
          scrub: 0.55,
          onUpdate: (s) => update(s.progress * SPAN),
          onRefresh: (s) => update(s.progress * SPAN),
        });

        api.current.go = (i) => {
          const vh = pin.offsetHeight;
          window.scrollTo({ top: st.start + GOTO[i] * vh, behavior: "smooth" });
        };
        api.current.toggle = (i) => {
          if (i !== idx) return api.current.go(i);
          const v = videos[i];
          if (v.paused) { userPaused.delete(i); play(i, false); } else { userPaused.add(i); v.pause(); mark(i, true); }
        };

        const onVis = () => {
          if (document.hidden) pauseAll();
          else if (live && idx >= 0 && !userPaused.has(idx)) play(idx, false);
        };
        document.addEventListener("visibilitychange", onVis);

        return () => {
          document.removeEventListener("visibilitychange", onVis);
          st.kill();
          tl.kill();
          pauseAll();
          gsap.set([...cards, ...parts], { clearProps: "all" });
        };
      });

      return () => {
        mm.revert();
        near.kill();
        clearTimeout(resumeT);
        if (heldSmoke && !document.hidden && !reduceMq.matches) smoke()?.play().catch(() => {});
        videos.forEach((v) => { v.removeEventListener("play", onPlay); v.removeEventListener("pause", onPause); });
      };
    },
    { scope: root },
  );

  // arrastar na horizontal troca o card (rolando até o passo correspondente); toque simples = play/pause
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (i: number) => (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!stacked && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      const to = Math.max(0, Math.min(ITEMS.length - 1, active + (dx < 0 ? 1 : -1)));
      if (to !== active) api.current.go(to);
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) api.current.toggle(i);
  };

  return (
    <section ref={root} id="resultados" className="results-section" aria-labelledby="t-results">
      <div className="results-track">
        <div className="results-pin">
          <header className="results-head wrap">
            <h2 id="t-results" className="display">{c.title}</h2>
            <span className="rule" />
            <p className="results-sub">{c.subtitle}</p>
          </header>
          <div className="results-stage" aria-roledescription="carrossel">
            {ITEMS.map((it, i) => (
              <figure
                key={it.video}
                className={`result-card ${playing === i ? "is-playing" : ""} ${needsTap[i] && playing !== i ? "needs-tap" : ""}`}
                aria-label={`Resultado ${i + 1} de ${ITEMS.length}`}
                aria-hidden={!stacked && i !== active}
                onPointerDown={onDown}
                onPointerUp={onUp(i)}
                onPointerCancel={() => { drag.current = null; }}
              >
                <video muted playsInline preload="metadata" disablePictureInPicture aria-hidden="true" />
                <button
                  type="button"
                  className="result-play"
                  tabIndex={!stacked && i !== active ? -1 : 0}
                  aria-label={playing === i ? `Pausar resultado ${i + 1}` : `Reproduzir resultado ${i + 1}`}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={() => api.current.toggle(i)}
                >
                  <IconPlay />
                </button>
              </figure>
            ))}
          </div>
          <div className="results-foot wrap">
            <div className="results-progress">
              <span className="results-count" aria-live="polite">
                <strong>{pad(active + 1)}</strong> / {pad(ITEMS.length)}
              </span>
              <span className="results-dots">
                {ITEMS.map((it, i) => (
                  <button
                    key={it.poster}
                    type="button"
                    className="results-dot"
                    aria-label={`Ver resultado ${i + 1}`}
                    aria-current={i === active}
                    onClick={() => api.current.go(i)}
                  />
                ))}
              </span>
            </div>
            <p className="results-hint">{c.hint}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
