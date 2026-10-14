"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/base";

const L = asset("/assets/hero-live");

/**
 * Camada 0 do hero: fumaça em vídeo, atrás de tudo, sem nenhum vínculo com o ScrollTrigger/GSAP.
 * - O fallback estático fica sempre por baixo: se o vídeo não carregar (erro, autoplay bloqueado,
 *   economia de dados), é ele que aparece.
 * - prefers-reduced-motion: o vídeo não toca (fica o poster).
 * - Fora da tela / aba oculta: pausa, para não gastar decodificação à toa no mobile.
 */
export default function HeroBackground({ video }: { video: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // falha ocorrida antes da hidratação (o evento "error" já passou): detecta pelo estado do elemento
    if (v.error || v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) { setFailed(true); return; }
    const onSourceError = () => setFailed(true);
    const source = v.querySelector("source");
    source?.addEventListener("error", onSourceError);
    v.addEventListener("error", onSourceError);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tryPlay = () => {
      if (reduce.matches || document.hidden) return v.pause();
      v.play().catch(() => { /* autoplay bloqueado: o poster/fallback continua visível */ });
    };
    const onVisibility = () => tryPlay();
    tryPlay();
    document.addEventListener("visibilitychange", onVisibility);
    reduce.addEventListener?.("change", tryPlay);
    return () => {
      source?.removeEventListener("error", onSourceError);
      v.removeEventListener("error", onSourceError);
      document.removeEventListener("visibilitychange", onVisibility);
      reduce.removeEventListener?.("change", tryPlay);
    };
  }, []);

  return (
    <div className="hero-bg">
      <img src={`${L}/background_fallback.jpg`} alt="" decoding="async" />
      {video && !failed && (
        <video
          ref={ref}
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          poster={`${L}/smoke_background_poster.jpg`}
          disablePictureInPicture
          disableRemotePlayback
        >
          <source src={`${L}/smoke_background_loop.mp4`} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
