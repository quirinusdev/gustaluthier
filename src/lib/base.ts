/**
 * Prefixo de caminho do site publicado em subpasta (GitHub Pages: /gustaluthier).
 * Vazio em dev e no `next start`. Definido no build por NEXT_PUBLIC_BASE_PATH.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Caminho de um arquivo de /public com o prefixo do site. */
export const asset = (path: string) => `${BASE_PATH}${path}`;
