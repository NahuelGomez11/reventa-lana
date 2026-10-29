// Carga los datos de PRUEBA (ficticios) en el navegador para usar la app como
// si fuera un revendedor de tecnología. NO son precios reales de mercado.
//
// Uso:
//   1) Levantá el frontend:   .\node_modules\.bin\ng serve
//   2) Abrí http://localhost:4200
//   3) Pegá TODO este archivo en la consola del navegador (F12) y Enter.
//   4) Se recarga la app con 28 productos y 6 proveedores ficticios.
//
// Para borrar los datos de prueba: localStorage.clear() y recargar.
(async () => {
  const CLAVE_PROVEEDORES = 'reventa.intelligence.proveedores.v1';
  const CLAVE_PRODUCTOS = 'reventa.intelligence.productos.v1';

  const respuesta = await fetch('/datos-demo.json');
  if (!respuesta.ok) {
    console.error('No se pudo leer /datos-demo.json (¿está corriendo ng serve?).', respuesta.status);
    return;
  }
  const datos = await respuesta.json();

  localStorage.setItem(CLAVE_PROVEEDORES, JSON.stringify(datos.proveedores));
  localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(datos.productos));

  console.log('%c' + datos.aviso, 'font-weight:bold');
  console.log(`${datos.productos.length} productos de prueba y ${datos.proveedores.length} proveedores ficticios cargados.`);
  location.reload();
})();
