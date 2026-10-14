/**
 * Dados de contato. Preencher quando o cliente fornecer os dados finais.
 * Enquanto estiverem vazios, os CTAs apontam para a seção de contato
 * (nenhum link fictício é publicado).
 */
export const SITE = {
  whatsapp: {
    /** Somente dígitos, com DDI + DDD. Ex.: "5535999999999" */
    number: "",
    message: "Olá! Gostaria de um orçamento para o meu instrumento.",
  },
  instagram: {
    /** URL completa do perfil oficial. */
    url: "",
  },
};

export function whatsappHref() {
  const { number, message } = SITE.whatsapp;
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "#contato";
}

/** Abre o WhatsApp com uma mensagem pronta. Sem número configurado, o wa.me abre a escolha de contato. */
export function whatsappMessageHref(message: string) {
  const { number } = SITE.whatsapp;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function instagramHref() {
  return SITE.instagram.url || "#contato";
}

export function isExternal(href: string) {
  return href.startsWith("http");
}
