import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { FuenteMercadoHttp } from './data/adapters/fuente-mercado-http';
import { FUENTE_MERCADO, MERCADO_BASE_URL } from './data/mercado-store.service';

/**
 * URL del backend propio de búsqueda de mercado (que guarda las credenciales de la API).
 * Por defecto no está configurado: la app avisa en vez de inventar datos.
 * Se puede definir en tiempo de ejecución con: globalThis.__REVENTA_MERCADO_BASE_URL__
 *
 * Nota: Mercado Libre bloquea las llamadas directas desde el navegador (403), por lo que
 * la búsqueda y la importación por link requieren el backend propio con credenciales OAuth.
 */
function baseUrlMercado(): string | null {
  const valor = (globalThis as Record<string, unknown>)['__REVENTA_MERCADO_BASE_URL__'];
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: MERCADO_BASE_URL, useValue: baseUrlMercado() },
    {
      provide: FUENTE_MERCADO,
      useFactory: () => new FuenteMercadoHttp(inject(HttpClient), inject(MERCADO_BASE_URL)),
    },
  ],
};
