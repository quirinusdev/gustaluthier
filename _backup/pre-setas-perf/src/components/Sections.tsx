import { Fragment, type ReactNode } from "react";
import { CONTENT } from "@/lib/content";
import QuoteForm from "./QuoteForm";
import { instagramHref, isExternal, whatsappHref } from "@/lib/site";
import {
  IconAcoustic, IconArrow, IconBass, IconGuitar, IconInstagram,
  IconLocation, IconScroll, IconStar, IconWhatsapp,
} from "./Icons";

/** "{texto}" → destaque vermelho */
export function rich(line: string): ReactNode {
  return line.split(/(\{[^}]+\})/).map((chunk, i) =>
    chunk.startsWith("{") ? <em key={i}>{chunk.slice(1, -1)}</em> : <Fragment key={i}>{chunk}</Fragment>,
  );
}

function Title({ lines, className = "" }: { lines: string[]; className?: string }) {
  return (
    <h2 className={`display ${className}`}>
      {lines.map((l, i) => (
        <span key={i} className="display-line">{rich(l)}</span>
      ))}
    </h2>
  );
}

function ext(href: string) {
  return isExternal(href) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? "brand--compact" : ""}`}>
      <img className="brand-mark" src="/assets/logo-mark.webp" alt="" width={88} height={129} />
      <span className="brand-text">
        <span className="brand-name">Gusta</span>
        <span className="brand-sub">Luthieria</span>
      </span>
    </span>
  );
}

/* 01 — Impacto */
export function IntroPanel() {
  const c = CONTENT.intro;
  const wa = whatsappHref();
  return (
    <section id="inicio" className="panel panel--intro" aria-labelledby="t-intro">
      <div className="panel-sticky">
        <div className="intro-copy wrap">
          <h1 id="t-intro" className="display display--hero">
            {c.title.map((l, i) => <span key={i} className="display-line reveal">{rich(l)}</span>)}
          </h1>
          <p className="kicker reveal">{c.tagline.join(" • ")}</p>
          <a className="btn-primary reveal" href={wa} {...ext(wa)}>
            <IconWhatsapp className="btn-icon" /> {c.cta} <IconArrow className="i-arrow" />
          </a>
          <div className="scroll-hint reveal"><IconScroll className="scroll-icon" /><span>{c.scrollHint}</span></div>
        </div>
      </div>
    </section>
  );
}

/* 02 — Quem é a Gusta */
export function AboutPanel() {
  const c = CONTENT.about;
  const icons = [IconGuitar, IconAcoustic, IconBass];
  return (
    <section id="quem-somos" className="panel panel--about" aria-labelledby="t-about">
      <div className="panel-sticky">
        <div className="about-copy wrap">
          <Title lines={c.title} />
          <span className="rule" />
          <p className="lead">{c.text}</p>
          <p className="location"><IconLocation className="i-loc" /> {CONTENT.location}</p>
        </div>
        <ul className="instruments wrap">
          {c.instruments.map((name, i) => {
            const I = icons[i];
            return <li key={name}><I className="instrument-icon" /><span>{name}</span></li>;
          })}
        </ul>
      </div>
    </section>
  );
}

/* 03 — Serviços (hotspots) */
export function ServicesPanel() {
  const c = CONTENT.services;
  return (
    <section id="servicos" className="panel panel--services" aria-labelledby="t-services">
      <div className="panel-sticky">
        <div className="services-head wrap">
          <h2 id="t-services" className="display">{c.title.map((l, i) => <span key={i} className="display-line">{l}</span>)}</h2>
          <span className="rule" />
        </div>
        <ul className="service-cards">
          {c.items.map((s) => (
            <li key={s.id} className="service-card" data-card={s.id}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* 04 — Trabalho / credibilidade */
export function CredibilitySection() {
  const c = CONTENT.credibility;
  return (
    <section id="trabalho" className="block block--cred" aria-labelledby="t-cred">
      <div className="wrap block-inner">
        <h2 id="t-cred" className="display">{c.title.map((l, i) => <span key={i} className="display-line">{rich(l)}</span>)}</h2>
        <p className="lead">{c.text}</p>
        <ul className="reviews">
          {c.reviews.map((r, i) => (
            <li key={i} className="review">
              <span className="review-avatar" aria-hidden="true">{r.initials}</span>
              <div>
                <p className="review-name">{r.name}</p>
                <p className="review-stars" aria-label="5 de 5 estrelas">{[0, 1, 2, 3, 4].map((k) => <IconStar key={k} />)}</p>
                <p className="review-text">“{r.text}”</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* 06 — CTA final */
export function CtaSection() {
  const c = CONTENT.cta;
  const ig = instagramHref();
  return (
    <>
      {/* Painel pinned do fechamento: sobrepõe o fim do exploded e só libera o pin com o formulário completo */}
      <section id="contato" className="panel panel--cta" aria-labelledby="t-cta">
        <div className="panel-sticky">
          <div className="wrap cta-stage">
            <h2 id="t-cta" className="display display--center">{c.title.map((l, i) => <span key={i} className="display-line">{rich(l)}</span>)}</h2>
            <p className="kicker kicker--center">{c.services}</p>
            <QuoteForm />
          </div>
        </div>
      </section>
      <div className="block block--footer">
        <div className="wrap block-inner">
          <div className="cta-brand">
            <Brand />
            <p className="location"><IconLocation className="i-loc" /> {CONTENT.location}</p>
            <a className="footer-ig" href={ig} {...ext(ig)} aria-label="Instagram da Gusta Luthieria">
              <IconInstagram className="footer-ig-icon" /> Instagram
            </a>
          </div>
          <footer className="site-footer">
            <p>© {new Date().getFullYear()} {CONTENT.footer.rights}</p>
            <p>{CONTENT.footer.credit} <strong>{CONTENT.footer.studio}</strong></p>
          </footer>
        </div>
      </div>
    </>
  );
}
