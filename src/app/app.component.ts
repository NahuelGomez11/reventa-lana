import { Component } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface ItemMenu {
  ruta: string;
  texto: string;
  icono: 'inicio' | 'productos' | 'proveedores' | 'ajustes';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly appName = 'LANA';

  /** Menú en orden: en móvil se usa el orden de la barra inferior. */
  readonly items: ItemMenu[] = [
    { ruta: '/dashboard', texto: 'Inicio', icono: 'inicio' },
    { ruta: '/productos', texto: 'Productos', icono: 'productos' },
    { ruta: '/comparar', texto: 'Comparar', icono: 'productos' },
    { ruta: '/proveedores', texto: 'Proveedores', icono: 'proveedores' },
    { ruta: '/configuracion', texto: 'Ajustes', icono: 'ajustes' },
  ];

  readonly itemsMovil = this.items;
}
