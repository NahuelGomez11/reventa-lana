import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'productos',
    loadComponent: () =>
      import('./features/productos/productos.component').then((m) => m.ProductosComponent),
  },
  {
    path: 'comparar',
    loadComponent: () =>
      import('./features/productos/comparador.component').then((m) => m.ComparadorComponent),
  },
  {
    path: 'productos/nuevo',
    loadComponent: () =>
      import('./features/productos/producto-form.component').then((m) => m.ProductoFormComponent),
  },
  {
    path: 'productos/:id/editar',
    loadComponent: () =>
      import('./features/productos/producto-form.component').then((m) => m.ProductoFormComponent),
  },
  {
    path: 'productos/:id',
    loadComponent: () =>
      import('./features/productos/detalle-producto.component').then((m) => m.DetalleProductoComponent),
  },
  {
    path: 'proveedores',
    loadComponent: () =>
      import('./features/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
  },
  {
    path: 'configuracion',
    loadComponent: () =>
      import('./features/configuracion/configuracion.component').then((m) => m.ConfiguracionComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
