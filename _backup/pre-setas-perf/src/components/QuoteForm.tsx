"use client";

import { useId, useState, type FormEvent } from "react";
import { CONTENT } from "@/lib/content";
import { whatsappMessageHref } from "@/lib/site";
import { IconArrow, IconWhatsapp } from "./Icons";

type Field = "name" | "instrument" | "service" | "description";
const MAX_DESC = 240;

/**
 * Formulário de orçamento (SPEC Formulário WhatsApp v1): 4 campos + 1 CTA.
 * Sem backend: valida, monta a mensagem e abre o WhatsApp já preenchido (wa.me + encodeURIComponent).
 */
export default function QuoteForm() {
  const f = CONTENT.quoteForm;
  const uid = useId();
  const [values, setValues] = useState<Record<Field, string>>({ name: "", instrument: "", service: "", description: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const set = (k: Field) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = values.name.trim();
    const next: Partial<Record<Field, string>> = {};
    if (name.length < 2) next.name = f.errors.name;
    if (!values.instrument) next.instrument = f.errors.instrument;
    if (!values.service) next.service = f.errors.service;
    setErrors(next);
    const first = (["name", "instrument", "service"] as Field[]).find((k) => next[k]);
    if (first) {
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    const desc = values.description.trim();
    const message =
      `Olá! Vim pelo site da Gusta Luthieria. Meu nome é ${name}. ` +
      `Instrumento: ${values.instrument}. Serviço: ${values.service}.` +
      (desc ? ` Descrição: ${desc}` : "");
    window.open(whatsappMessageHref(message), "_blank", "noopener,noreferrer");
  };

  const err = (k: Field) =>
    errors[k] ? (
      <span className="qf-error" id={`${uid}-${k}-err`} role="alert">{errors[k]}</span>
    ) : null;
  const a11y = (k: Field) => ({
    id: `${uid}-${k}`,
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `${uid}-${k}-err` : undefined,
  });

  return (
    <form className="quote-form" onSubmit={onSubmit} noValidate>
      <div className="qf-field">
        <label htmlFor={`${uid}-name`}>{f.labels.name}</label>
        <input {...a11y("name")} name="name" type="text" autoComplete="given-name" maxLength={60}
          placeholder={f.placeholders.name} value={values.name} onChange={set("name")} required />
        {err("name")}
      </div>
      <div className="qf-row">
        <div className="qf-field">
          <label htmlFor={`${uid}-instrument`}>{f.labels.instrument}</label>
          <select {...a11y("instrument")} name="instrument" value={values.instrument} onChange={set("instrument")} required>
            <option value="" disabled>{f.placeholders.select}</option>
            {f.instruments.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {err("instrument")}
        </div>
        <div className="qf-field">
          <label htmlFor={`${uid}-service`}>{f.labels.service}</label>
          <select {...a11y("service")} name="service" value={values.service} onChange={set("service")} required>
            <option value="" disabled>{f.placeholders.select}</option>
            {f.services.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {err("service")}
        </div>
      </div>
      <div className="qf-field">
        <label htmlFor={`${uid}-description`}>
          {f.labels.description} <span className="qf-optional">{f.labels.optional}</span>
        </label>
        <textarea {...a11y("description")} name="description" rows={3} maxLength={MAX_DESC}
          placeholder={f.placeholders.description} value={values.description} onChange={set("description")} />
        <span className="qf-count" aria-live="polite">{values.description.length}/{MAX_DESC}</span>
      </div>
      <button type="submit" className="btn-primary qf-submit">
        <IconWhatsapp className="btn-icon" /> {f.submit} <IconArrow className="i-arrow" />
      </button>
    </form>
  );
}
