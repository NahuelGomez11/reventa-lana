import { Injectable, signal } from '@angular/core';

const CLAVE = 'reventa_tema';

@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly oscuro = signal<boolean>(false);

  constructor() {
    let inicial = false;
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado === 'oscuro') inicial = true;
      else if (guardado === 'claro') inicial = false;
      else inicial = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      inicial = false;
    }
    this.oscuro.set(inicial);
    this.aplicar(inicial);
  }

  alternar(): void {
    const nuevo = !this.oscuro();
    this.oscuro.set(nuevo);
    this.aplicar(nuevo);
    try {
      localStorage.setItem(CLAVE, nuevo ? 'oscuro' : 'claro');
    } catch {
      // ignore
    }
  }

  private aplicar(oscuro: boolean): void {
    try {
      document.documentElement.classList.toggle('dark', oscuro);
    } catch {
      // ignore
    }
  }
}
