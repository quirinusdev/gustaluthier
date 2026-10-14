"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CONTENT } from "@/lib/content";
import { IconClose, IconExpand, IconPlay } from "./Icons";

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
  const api = useRef<{
    go: (i: number) => void;
    toggle: (i: number) => void;
    tap: (i: number) => void;        // toque no card: inativo → vai até ele; ativo → tela cheia
    view: (i: number) => void;       // botão de tela cheia
    close: () => void;
    viewerPlay: (on: boolean) => void;
  }>({ go: () => {}, toggle: () => {}, tap: () => {}, view: () => {}, close: () => {}, viewerPlay: () => {} });
  const c = CONTENT.results;
  // tela cheia: overlay em portal no <body> (acima do header) — fallback e caixa do fullscreen nativo
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerVideoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  useEffect(() => setMounted(true), []);

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
          if (!heldSmoke || videos.some((v) => !v.paused) || (viewerVideoRef.current && !viewerVideoRef.current.paused)) return;
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

      /* ---------- Tela cheia ----------
       * 1) Fullscreen API no overlay (desktop/Android): vídeo com controles nativos (play/pause/seek) + botão fechar.
       * 2) iPhone (sem fullscreen de elemento): player nativo do próprio vídeo do card (webkitEnterFullscreen).
       * 3) Sem nenhum dos dois: o overlay como modal fixo.
       * O vídeo do card pausa ao abrir; ao fechar, a posição de scroll e o card ativo voltam exatamente como estavam
       * e o vídeo do card continua do ponto em que a pessoa parou. Nunca dois vídeos tocando juntos. */
      let viewing = -1;
      let savedY = 0;
      const hooks = { resume: (i: number, t: number) => void [i, t] };
      const lockScroll = (on: boolean) => document.documentElement.classList.toggle("is-viewing", on);
      const restoreScroll = () => {
        const back = () => { if (Math.abs(window.scrollY - savedY) > 1) window.scrollTo(0, savedY); };
        requestAnimationFrame(back);
        window.setTimeout(back, 400); // depois do resize/refresh da saída do fullscreen
      };
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeViewer(); };
      const onFs = () => { if (!document.fullscreenElement && viewing >= 0) closeViewer(); };
      const closeViewer = () => {
        if (viewing < 0) return;
        const i = viewing;
        viewing = -1;
        const box = viewerRef.current, vv = viewerVideoRef.current;
        const t = vv?.currentTime || 0;
        vv?.pause();
        if (box) { box.classList.remove("is-open"); box.hidden = true; }
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("fullscreenchange", onFs);
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        lockScroll(false);
        restoreScroll();
        hooks.resume(i, t);
        releaseSmoke();
        cards[i].querySelector<HTMLButtonElement>(".result-fs")?.focus({ preventScroll: true });
      };
      const openViewer = (i: number) => {
        if (viewing >= 0) return;
        source(i);
        const inline = videos[i] as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
        const box = viewerRef.current, vv = viewerVideoRef.current;
        const elementFs = !!(box && document.fullscreenEnabled && box.requestFullscreen);
        savedY = window.scrollY;
        if (!elementFs && inline.webkitEnterFullscreen) {
          viewing = i;
          const onEnd = () => {
            inline.removeEventListener("webkitendfullscreen", onEnd);
            viewing = -1;
            restoreScroll();
            hooks.resume(i, inline.currentTime);
          };
          inline.addEventListener("webkitendfullscreen", onEnd);
          inline.play().catch(() => {});
          try { inline.webkitEnterFullscreen(); } catch { onEnd(); }
          return;
        }
        if (!box || !vv) return;
        viewing = i;
        const t = inline.currentTime || 0;
        pauseAll();
        setViewerIndex(i);
        vv.muted = true;
        vv.poster = ITEMS[i].poster;
        if (vv.getAttribute("src") !== ITEMS[i].video) { vv.src = ITEMS[i].video; vv.load(); }
        // continua do ponto do card: o seek espera a metadata; o play sai já, dentro do gesto do usuário
        const seek = () => { try { vv.currentTime = t; } catch { /* sem metadata */ } };
        if (vv.readyState >= 1) seek(); else vv.addEventListener("loadedmetadata", seek, { once: true });
        vv.play().catch(() => {});
        box.hidden = false;
        box.classList.add("is-open");
        lockScroll(true);
        document.addEventListener("keydown", onKey);
        if (elementFs) {
          document.addEventListener("fullscreenchange", onFs);
          box.requestFullscreen({ navigationUI: "hide" }).catch(() => {}); // recusado → segue como modal
        }
        closeRef.current?.focus({ preventScroll: true });
      };
      api.current.view = openViewer;
      api.current.close = closeViewer;
      api.current.viewerPlay = (on) => { if (on) { pauseAll(); holdSmoke(); } else releaseSmoke(); };

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
          api.current.tap = openViewer;
          hooks.resume = (i, t) => { try { videos[i].currentTime = t; } catch { /* sem metadata */ } };
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
            if (l && viewing < 0) play(i, true);
          } else if (l && !live && !userPaused.has(i) && viewing < 0) play(i, true);
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
        api.current.tap = (i) => (i !== idx ? api.current.go(i) : openViewer(i));
        // ao fechar: mesmo card, continuando do ponto em que a pessoa parou (sem reiniciar)
        hooks.resume = (i, t) => {
          try { videos[i].currentTime = t; } catch { /* sem metadata */ }
          if (i === idx && live && !userPaused.has(i)) play(i, false);
        };

        const onVis = () => {
          if (document.hidden) pauseAll();
          else if (live && idx >= 0 && !userPaused.has(idx) && viewing < 0) play(idx, false);
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
        closeViewer();
        mm.revert();
        near.kill();
        clearTimeout(resumeT);
        if (heldSmoke && !document.hidden && !reduceMq.matches) smoke()?.play().catch(() => {});
        videos.forEach((v) => { v.removeEventListener("play", onPlay); v.removeEventListener("pause", onPause); });
      };
    },
    { scope: root },
  );

  // arrastar na horizontal troca o card (rolando até o passo correspondente); toque simples = tela cheia
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
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) api.current.tap(i);
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
                <button
                  type="button"
                  className="result-fs"
                  tabIndex={!stacked && i !== active ? -1 : 0}
                  aria-label={`Ver resultado ${i + 1} em tela cheia`}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={() => api.current.view(i)}
                >
                  <IconExpand />
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
      {mounted &&
        createPortal(
          <div ref={viewerRef} className="results-viewer" role="dialog" aria-modal="true" aria-label={`Resultado ${viewerIndex + 1} em tela cheia`} hidden>
            <video
              ref={viewerVideoRef}
              controls
              playsInline
              muted
              loop
              preload="none"
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              onPlay={() => api.current.viewerPlay(true)}
              onPause={() => api.current.viewerPlay(false)}
            />
            <button ref={closeRef} type="button" className="results-viewer-close" aria-label="Fechar tela cheia" onClick={() => api.current.close()}>
              <IconClose />
            </button>
          </div>,
          document.body,
        )}
    </section>
  );
}
