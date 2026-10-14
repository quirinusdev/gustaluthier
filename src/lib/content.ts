/**
 * PLACEHOLDERS — textos provisórios do storyboard, usados só para estruturar a UI.
 * A copy final entra aqui sem tocar na lógica de animação.
 * Trechos entre {chaves} são renderizados em vermelho (destaque).
 */
export const CONTENT = {
  location: "Muzambinho - MG",
  intro: {
    title: ["Seu", "instrumento", "em {boas mãos.}"],
    tagline: ["Guitarras", "Violões", "Baixos"],
    cta: "Agendar pelo WhatsApp",
    scrollHint: "Role para explorar",
  },
  about: {
    title: ["Quem é", "a Gusta?"],
    text: "Luthieria especializada em manutenção, regulagem e customização de guitarras, violões e baixos.",
    instruments: ["Guitarras", "Violões", "Baixos"],
  },
  services: {
    title: ["Nossos", "serviços"],
    items: [
      { id: "regulagem", title: "Regulagem", text: "Ajuste preciso para o seu som." },
      { id: "manutencao", title: "Manutenção", text: "Mais vida para o seu instrumento." },
      { id: "customizacao", title: "Customização", text: "Seu estilo, sem limites." },
    ],
  },
  credibility: {
    title: ["Cuidado", "técnico em", "cada {detalhe.}"],
    text: "Mais que ajustes, é respeito pela música, pelo instrumento e por quem toca.",
    reviews: [
      { name: "Nome do cliente", initials: "NC", text: "Depoimento do cliente — placeholder até o envio dos feedbacks reais." },
      { name: "Nome do cliente", initials: "NC", text: "Depoimento do cliente — placeholder até o envio dos feedbacks reais." },
    ],
  },
  results: {
    title: "Resultados",
    subtitle: "Trabalhos reais da Gusta Luthieria",
    hint: "Arraste ou role para ver outros resultados",
  },
  cta: {
    title: ["Vamos cuidar", "do seu {som?}"],
    services: "Manutenção • Regulagem • Customização",
  },
  quoteForm: {
    labels: { name: "Nome", instrument: "Instrumento", service: "Serviço", description: "Descrição curta", optional: "(opcional)" },
    placeholders: { name: "Seu nome", select: "Selecione", description: "Conte rapidamente o que está acontecendo" },
    instruments: ["Guitarra", "Violão", "Baixo"],
    services: ["Regulagem", "Manutenção", "Customização"],
    submit: "Enviar pelo WhatsApp",
    errors: { name: "Informe seu nome", instrument: "Escolha o instrumento", service: "Escolha o serviço" },
  },
  footer: {
    rights: "Gusta Luthieria. Todos os direitos reservados.",
    credit: "Desenvolvido por",
    studio: "Noryx Digital Studio",
  },
  nav: [
    { href: "#inicio", label: "Início" },
    { href: "#quem-somos", label: "Quem é a Gusta" },
    { href: "#servicos", label: "Serviços" },
    { href: "#trabalho", label: "Trabalho" },
    { href: "#resultados", label: "Resultados" },
    { href: "#contato", label: "Contato" },
  ],
};
