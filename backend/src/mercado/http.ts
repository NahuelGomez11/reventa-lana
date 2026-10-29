/** Token de inyeccion para la funcion `fetch` (permite sustituirla en pruebas). */
export const HTTP_FETCH = Symbol('HTTP_FETCH');

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
