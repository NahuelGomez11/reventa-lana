// Genera el dataset de PRUEBA (ficticio) para demostrar la app como si fuera
// un revendedor de tecnología. NO son precios reales de mercado, ni provienen
// de Mercado Libre ni de ninguna fuente externa: son números inventados a mano.
//
// Uso:  node scripts/generar-demo.mjs
// Salidas (generadas, no editar a mano):
//   src/app/demo/datos-demo.ts   -> datos tipados para las pruebas (spec)
//   public/datos-demo.json       -> servido por `ng serve` para cargarlo en el navegador
//
// Regla del proyecto: los datos ficticios deben identificarse y no pasar por reales.
// Por eso todo producto/proveedor/observación lleva el prefijo [DEMO].

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ahora = new Date();

/** Fecha ISO hace N días (para que las observaciones no queden "desactualizadas"). */
function hace(dias) {
  return new Date(ahora.getTime() - dias * 86_400_000).toISOString();
}

// ---------------------------------------------------------------------------
// Catálogo de proveedores ficticios
// ---------------------------------------------------------------------------
const PROVEEDORES = [
  {
    id: 'demo-prov-1',
    nombre: '[DEMO] Importaciones Sur',
    telefono: null,
    email: 'ventas@demo-importaciones-sur.invalid',
    web: 'https://ejemplo.invalid/importaciones-sur',
    direccion: 'Av. Demo 1000, Córdoba',
    notas: 'Mayorista ficticio. Buena precio por volumen, compra mínima alta.',
    creadoEn: hace(120),
    actualizadoEn: hace(3),
  },
  {
    id: 'demo-prov-2',
    nombre: '[DEMO] Distribuidora Norte',
    telefono: null,
    email: 'contacto@demo-norte.invalid',
    web: null,
    direccion: 'Santa Fe 2000, Rosario',
    notas: 'Ficticio. Precio intermedio y envío más caro.',
    creadoEn: hace(110),
    actualizadoEn: hace(5),
  },
  {
    id: 'demo-prov-3',
    nombre: '[DEMO] TecnoLiquidación',
    telefono: null,
    email: null,
    web: 'https://ejemplo.invalid/tecno-liq',
    direccion: null,
    notas: 'Ficticio. El más barato, stock limitado y garantía corta.',
    creadoEn: hace(90),
    actualizadoEn: hace(2),
  },
  {
    id: 'demo-prov-4',
    nombre: '[DEMO] Retail Partner',
    telefono: null,
    email: null,
    web: null,
    direccion: 'CABA',
    notas: 'Ficticio. Más caro pero sin compra mínima.',
    creadoEn: hace(80),
    actualizadoEn: hace(7),
  },
  {
    id: 'demo-prov-5',
    nombre: '[DEMO] Outlet Mayorista',
    telefono: null,
    email: null,
    web: null,
    direccion: null,
    notas: 'Ficticio. Unidades reacondicionadas o de vitrina.',
    creadoEn: hace(60),
    actualizadoEn: hace(4),
  },
  {
    id: 'demo-prov-6',
    nombre: '[DEMO] Envío Rápido CBA',
    telefono: null,
    email: null,
    web: null,
    direccion: 'Córdoba Capital',
    notas: 'Ficticio. Entrega en 24 h con recargo de envío.',
    creadoEn: hace(50),
    actualizadoEn: hace(1),
  },
];

// ---------------------------------------------------------------------------
// Productos (tabla compacta)
// ---------------------------------------------------------------------------
// Comisiones/impuestos: 13% comisión de canal de venta y 0% de impuestos
// (monotributo) salvo donde se indique. Son supuestos ficticios.
const P = [
  {
    c: 'buds6',
    n: 'Auriculares inalámbricos',
    marca: 'Xiaomi',
    mod: 'Redmi Buds 6',
    cat: 'Audio',
    cantidad: 12,
    costo: 42_000,
    envioProv: 18_000,
    otrosCompra: 6_000,
    venta: 74_999,
    envioCli: 4_500,
    otrosVenta: 400,
    pub: 1_200,
    mercado: [72_999, 75_500, 78_900, 74_200, 76_800],
    provs: [
      ['demo-prov-1', 42_000, 40, 18_000, 6, '3 meses'],
      ['demo-prov-3', 39_500, 8, 22_000, 2, null],
      ['demo-prov-4', 46_800, 15, 9_000, 1, '6 meses'],
    ],
  },
  {
    c: 'band9',
    n: 'Pulsera de actividad',
    marca: 'Xiaomi',
    mod: 'Smart Band 9',
    cat: 'Wearables',
    cantidad: 10,
    costo: 78_000,
    envioProv: 15_000,
    otrosCompra: 5_000,
    venta: 129_999,
    envioCli: 4_500,
    otrosVenta: 400,
    pub: 1_500,
    mercado: [124_900, 128_500, 132_000, 127_400, 130_900, 126_000],
    provs: [
      ['demo-prov-1', 78_000, 25, 15_000, 5, '6 meses'],
      ['demo-prov-2', 81_500, 20, 24_000, 3, '6 meses'],
      ['demo-prov-4', 88_000, 12, 8_000, 1, '12 meses'],
    ],
  },
  {
    c: 'a15',
    n: 'Celular 128 GB',
    marca: 'Samsung',
    mod: 'Galaxy A15',
    cat: 'Celulares',
    cantidad: 8,
    costo: 245_000,
    envioProv: 20_000,
    otrosCompra: 12_000,
    venta: 339_999,
    envioCli: 6_500,
    otrosVenta: 600,
    pub: 3_000,
    mercado: [329_000, 338_500, 345_000, 333_900, 341_000],
    provs: [
      ['demo-prov-1', 245_000, 18, 20_000, 4, '12 meses oficial'],
      ['demo-prov-2', 251_000, 10, 32_000, 2, '12 meses'],
      ['demo-prov-6', 248_500, 6, 15_000, 1, '12 meses'],
    ],
  },
  {
    c: 'g54',
    n: 'Celular 5G 256 GB',
    marca: 'Motorola',
    mod: 'Moto G54',
    cat: 'Celulares',
    cantidad: 8,
    costo: 285_000,
    envioProv: 20_000,
    otrosCompra: 10_000,
    venta: 389_999,
    envioCli: 6_500,
    otrosVenta: 600,
    pub: 3_200,
    mercado: [379_900, 389_000, 399_000, 385_500, 392_000],
    provs: [
      ['demo-prov-1', 285_000, 14, 20_000, 4, '12 meses'],
      ['demo-prov-3', 272_000, 3, 26_000, 1, '3 meses'],
      ['demo-prov-4', 302_000, 9, 10_000, 1, '12 meses'],
    ],
  },
  {
    c: 'rn13pro',
    n: 'Celular 256 GB',
    marca: 'Xiaomi',
    mod: 'Redmi Note 13 Pro',
    cat: 'Celulares',
    cantidad: 6,
    costo: 420_000,
    envioProv: 18_000,
    otrosCompra: 14_000,
    venta: 579_999,
    envioCli: 6_500,
    otrosVenta: 800,
    pub: 4_000,
    mercado: [559_000, 572_000, 589_900, 565_500, 598_000, 579_000],
    provs: [
      ['demo-prov-1', 420_000, 12, 18_000, 3, '12 meses'],
      ['demo-prov-2', 431_000, 8, 30_000, 2, '12 meses'],
      ['demo-prov-6', 424_000, 4, 12_000, 1, '12 meses'],
    ],
  },
  {
    c: 'ideapad3',
    n: 'Notebook 15,6" Ryzen 5 / 8 GB / 512 GB',
    marca: 'Lenovo',
    mod: 'IdeaPad 3',
    cat: 'Notebooks',
    cantidad: 5,
    costo: 690_000,
    envioProv: 25_000,
    otrosCompra: 15_000,
    venta: 949_999,
    envioCli: 9_000,
    otrosVenta: 900,
    pub: 5_500,
    mercado: [919_000, 945_000, 969_900, 932_000, 958_000],
    provs: [
      ['demo-prov-1', 690_000, 9, 25_000, 2, '12 meses'],
      ['demo-prov-2', 705_000, 6, 38_000, 2, '12 meses'],
      ['demo-prov-4', 739_000, 5, 12_000, 1, '12 meses'],
    ],
  },
  {
    c: 'aspire5',
    n: 'Notebook 15,6" Core i5 / 8 GB / 512 GB',
    marca: 'Acer',
    mod: 'Aspire 5',
    cat: 'Notebooks',
    cantidad: 4,
    costo: 850_000,
    envioProv: 25_000,
    otrosCompra: 18_000,
    venta: 1_199_999,
    envioCli: 9_000,
    otrosVenta: 1_000,
    pub: 6_500,
    impPct: 21,
    mercado: [1_149_000, 1_189_000, 1_229_000, 1_169_500, 1_205_000],
    provs: [
      ['demo-prov-1', 850_000, 7, 25_000, 2, '12 meses'],
      ['demo-prov-3', 815_000, 2, 32_000, 1, '3 meses'],
      ['demo-prov-6', 862_000, 3, 14_000, 1, '12 meses'],
    ],
  },
  {
    c: 'taba9',
    n: 'Tablet 11" 64 GB',
    marca: 'Samsung',
    mod: 'Galaxy Tab A9',
    cat: 'Tablets',
    cantidad: 8,
    costo: 210_000,
    envioProv: 16_000,
    otrosCompra: 8_000,
    venta: 299_999,
    envioCli: 5_500,
    otrosVenta: 500,
    pub: 2_500,
    mercado: [289_000, 297_500, 309_000, 294_900, 302_000],
    provs: [
      ['demo-prov-1', 210_000, 16, 16_000, 4, '12 meses'],
      ['demo-prov-2', 216_500, 11, 26_000, 2, '12 meses'],
    ],
  },
  {
    c: 'tabm11',
    n: 'Tablet 11" 128 GB',
    marca: 'Lenovo',
    mod: 'Tab M11',
    cat: 'Tablets',
    cantidad: 8,
    costo: 240_000,
    envioProv: 16_000,
    otrosCompra: 9_000,
    venta: 349_999,
    envioCli: 5_500,
    otrosVenta: 500,
    pub: 2_800,
    mercado: [329_000, 342_000, 359_000, 337_000, 351_000],
    provs: [
      ['demo-prov-1', 240_000, 14, 16_000, 4, '12 meses'],
      ['demo-prov-5', 221_000, 3, 18_000, 1, '3 meses (vitrina)'],
    ],
  },
  {
    c: 'sam24',
    n: 'Monitor 24" FHD 75 Hz',
    marca: 'Samsung',
    mod: 'T350',
    cat: 'Monitores',
    cantidad: 8,
    costo: 165_000,
    envioProv: 22_000,
    otrosCompra: 8_000,
    venta: 239_999,
    envioCli: 7_500,
    otrosVenta: 700,
    pub: 2_200,
    mercado: [229_900, 238_000, 249_000, 234_500, 242_000],
    provs: [
      ['demo-prov-1', 165_000, 12, 22_000, 4, '36 meses'],
      ['demo-prov-2', 171_000, 9, 34_000, 2, '36 meses'],
      ['demo-prov-6', 168_000, 5, 16_000, 1, '36 meses'],
    ],
  },
  {
    c: 'ug27',
    n: 'Monitor 27" QHD 144 Hz',
    marca: 'LG',
    mod: 'UltraGear 27GP750',
    cat: 'Monitores',
    cantidad: 4,
    costo: 380_000,
    envioProv: 24_000,
    otrosCompra: 12_000,
    venta: 529_999,
    envioCli: 8_500,
    otrosVenta: 800,
    pub: 4_500,
    mercado: [499_000, 515_000, 539_000, 507_500, 545_000],
    provs: [
      ['demo-prov-1', 380_000, 6, 24_000, 2, '24 meses'],
      ['demo-prov-3', 362_000, 2, 30_000, 1, '3 meses'],
    ],
  },
  {
    c: 'kumara',
    n: 'Teclado mecánico',
    marca: 'Redragon',
    mod: 'Kumara K552',
    cat: 'Periféricos',
    cantidad: 15,
    costo: 38_000,
    envioProv: 14_000,
    otrosCompra: 4_000,
    venta: 64_999,
    envioCli: 4_500,
    otrosVenta: 300,
    pub: 1_000,
    mercado: [62_900, 65_500, 68_000, 63_900, 66_400],
    provs: [
      ['demo-prov-1', 38_000, 50, 14_000, 6, '12 meses'],
      ['demo-prov-3', 35_900, 10, 18_000, 3, '3 meses'],
      ['demo-prov-4', 42_500, 20, 7_000, 1, '12 meses'],
    ],
  },
  {
    c: 'g305',
    n: 'Mouse inalámbrico',
    marca: 'Logitech',
    mod: 'G305',
    cat: 'Periféricos',
    cantidad: 12,
    costo: 52_000,
    envioProv: 12_000,
    otrosCompra: 4_000,
    venta: 79_999,
    envioCli: 4_500,
    otrosVenta: 300,
    pub: 1_200,
    mercado: [76_900, 79_500, 82_900, 78_000, 80_900],
    provs: [
      ['demo-prov-1', 52_000, 30, 12_000, 5, '24 meses'],
      ['demo-prov-6', 54_500, 8, 9_000, 1, '24 meses'],
    ],
  },
  {
    c: 'jblgo4',
    n: 'Parlante portátil',
    marca: 'JBL',
    mod: 'Go 4',
    cat: 'Audio',
    cantidad: 10,
    costo: 58_000,
    envioProv: 12_000,
    otrosCompra: 5_000,
    venta: 89_999,
    envioCli: 4_500,
    otrosVenta: 350,
    pub: 1_400,
    mercado: [84_900, 88_500, 92_000, 86_900, 90_400],
    provs: [
      ['demo-prov-1', 58_000, 22, 12_000, 5, '12 meses'],
      ['demo-prov-2', 60_500, 15, 20_000, 3, '12 meses'],
      ['demo-prov-4', 65_000, 10, 7_000, 1, '12 meses'],
    ],
  },
  {
    c: 'xb100',
    n: 'Parlante portátil resistente',
    marca: 'Sony',
    mod: 'SRS-XB100',
    cat: 'Audio',
    cantidad: 8,
    costo: 85_000,
    envioProv: 12_000,
    otrosCompra: 5_000,
    venta: 129_999,
    envioCli: 4_500,
    otrosVenta: 400,
    pub: 1_800,
    mercado: [124_000, 128_900, 134_500, 126_500, 131_000],
    provs: [
      ['demo-prov-1', 85_000, 16, 12_000, 4, '12 meses'],
      ['demo-prov-3', 81_000, 3, 17_000, 1, '3 meses'],
    ],
  },
  {
    c: 'gts4',
    n: 'Smartwatch',
    marca: 'Amazfit',
    mod: 'GTS 4 Mini',
    cat: 'Wearables',
    cantidad: 8,
    costo: 115_000,
    envioProv: 14_000,
    otrosCompra: 6_000,
    venta: 179_999,
    envioCli: 4_500,
    otrosVenta: 400,
    pub: 2_000,
    mercado: [169_000, 175_500, 185_000, 172_000, 181_000],
    provs: [
      ['demo-prov-1', 115_000, 12, 14_000, 4, '12 meses'],
      ['demo-prov-2', 119_500, 9, 22_000, 2, '12 meses'],
    ],
  },
  {
    c: 'c270',
    n: 'Cámara web HD',
    marca: 'Logitech',
    mod: 'C270',
    cat: 'Accesorios',
    cantidad: 20,
    costo: 22_000,
    envioProv: 10_000,
    otrosCompra: 3_000,
    venta: 38_999,
    envioCli: 4_000,
    otrosVenta: 250,
    pub: 800,
    mercado: [35_900, 37_500, 39_900, 36_900, 38_400],
    provs: [
      ['demo-prov-1', 22_000, 60, 10_000, 8, '24 meses'],
      ['demo-prov-4', 25_900, 25, 6_000, 1, '24 meses'],
    ],
  },
  {
    c: 'nv2',
    n: 'SSD NVMe 1 TB',
    marca: 'Kingston',
    mod: 'NV2',
    cat: 'Almacenamiento',
    cantidad: 15,
    costo: 78_000,
    envioProv: 10_000,
    otrosCompra: 4_000,
    venta: 119_999,
    envioCli: 4_000,
    otrosVenta: 300,
    pub: 1_600,
    mercado: [112_000, 117_500, 123_900, 115_000, 120_400],
    provs: [
      ['demo-prov-1', 78_000, 40, 10_000, 6, '36 meses'],
      // Más barato y con stock suficiente para la cantidad planeada: dispara
      // la alerta PROVEEDOR_ALTERNATIVA_MAS_BARATA.
      ['demo-prov-3', 74_500, 15, 15_000, 6, '12 meses'],
      ['demo-prov-4', 84_000, 18, 6_000, 1, '36 meses'],
    ],
  },
  {
    c: 'wd2tb',
    n: 'Disco externo 2 TB',
    marca: 'Western Digital',
    mod: 'Elements',
    cat: 'Almacenamiento',
    cantidad: 8,
    costo: 145_000,
    envioProv: 12_000,
    otrosCompra: 5_000,
    venta: 219_999,
    envioCli: 5_000,
    otrosVenta: 400,
    pub: 2_200,
    mercado: [209_000, 216_500, 229_000, 213_000, 222_000],
    provs: [
      ['demo-prov-1', 145_000, 15, 12_000, 4, '24 meses'],
      ['demo-prov-2', 149_500, 10, 20_000, 2, '24 meses'],
    ],
  },
  {
    c: 'switch',
    n: 'Consola (usada)',
    marca: 'Nintendo',
    mod: 'Switch OLED',
    cat: 'Gaming',
    condicion: 'usado',
    cantidad: 6,
    costo: 380_000,
    envioProv: 15_000,
    otrosCompra: 20_000,
    venta: 519_999,
    envioCli: 8_000,
    otrosVenta: 700,
    pub: 4_000,
    mercado: [489_000, 505_000, 535_000, 498_000, 549_000],
    provs: [
      ['demo-prov-5', 380_000, 4, 15_000, 1, '1 mes (usado)'],
      ['demo-prov-2', 398_000, 3, 25_000, 1, '3 meses'],
    ],
  },
  {
    c: 'xboxpad',
    n: 'Joystick (usado)',
    marca: 'Microsoft',
    mod: 'Xbox Series',
    cat: 'Gaming',
    condicion: 'usado',
    cantidad: 10,
    costo: 75_000,
    envioProv: 8_000,
    otrosCompra: 5_000,
    venta: 119_999,
    envioCli: 4_000,
    otrosVenta: 300,
    pub: 1_500,
    mercado: [105_000, 112_000, 125_000, 108_500, 131_000],
    provs: [
      ['demo-prov-5', 75_000, 12, 8_000, 2, '1 mes (usado)'],
      ['demo-prov-4', 92_000, 6, 5_000, 1, '3 meses'],
    ],
  },
  {
    c: 'anker65',
    n: 'Cargador GaN 65 W',
    marca: 'Anker',
    mod: 'PowerPort III',
    cat: 'Accesorios',
    cantidad: 20,
    costo: 45_000,
    envioProv: 12_000,
    otrosCompra: 4_000,
    venta: 74_999,
    envioCli: 4_000,
    otrosVenta: 250,
    pub: 1_000,
    mercado: [69_900, 73_500, 78_000, 71_900, 76_400],
    provs: [
      ['demo-prov-1', 45_000, 45, 12_000, 8, '18 meses'],
      ['demo-prov-3', 42_800, 7, 16_000, 3, '6 meses'],
      ['demo-prov-4', 49_900, 20, 6_000, 1, '18 meses'],
    ],
  },
  {
    c: 'anker20k',
    n: 'Batería externa 20.000 mAh',
    marca: 'Anker',
    mod: 'PowerCore 20K',
    cat: 'Accesorios',
    cantidad: 12,
    costo: 62_000,
    envioProv: 12_000,
    otrosCompra: 4_000,
    venta: 99_999,
    envioCli: 4_500,
    otrosVenta: 300,
    pub: 1_400,
    mercado: [94_900, 98_500, 103_000, 96_900, 101_000],
    provs: [
      ['demo-prov-1', 62_000, 20, 12_000, 5, '18 meses'],
      ['demo-prov-2', 64_500, 14, 19_000, 3, '18 meses'],
    ],
  },
  {
    c: 'ax23',
    n: 'Router Wi-Fi 6',
    marca: 'TP-Link',
    mod: 'Archer AX23',
    cat: 'Redes',
    cantidad: 10,
    costo: 68_000,
    envioProv: 14_000,
    otrosCompra: 5_000,
    venta: 104_999,
    envioCli: 4_500,
    otrosVenta: 350,
    pub: 1_600,
    mercado: [98_900, 103_500, 109_000, 101_000, 106_500],
    provs: [
      ['demo-prov-1', 68_000, 25, 14_000, 5, '24 meses'],
      ['demo-prov-5', 61_000, 2, 16_000, 1, '6 meses (vitrina)'],
    ],
  },
];

// Casos "sucios" a propósito (así se comporta un libro de trabajo real):
// - margen bajo -> MARGEN_INSUFICIENTE
// - precio muy por encima del mercado -> PRECIO_FUERA_DE_MERCADO (media)
// - solo 2 observaciones -> INFO_MERCADO_INSUFICIENTE
// - datos sin completar -> DATOS_INCOMPLETOS
const P_SUCIOS = [
  {
    c: 'tv55',
    n: 'Televisor 55" QLED',
    marca: 'Samsung',
    mod: 'QN85C (demo)',
    cat: 'TV',
    cantidad: 3,
    costo: 780_000,
    envioProv: 30_000,
    otrosCompra: 20_000,
    venta: 1_099_999, // muy por encima del mercado
    envioCli: 12_000,
    otrosVenta: 1_200,
    pub: 7_000,
    mercado: [899_000, 925_000, 955_000, 910_000],
    provs: [
      ['demo-prov-1', 780_000, 4, 30_000, 1, '24 meses'],
      ['demo-prov-4', 815_000, 2, 15_000, 1, '24 meses'],
    ],
  },
  {
    c: 'watch9',
    n: 'Smartwatch deportivo',
    marca: 'Genérico',
    mod: 'Fit Pro (demo)',
    cat: 'Wearables',
    cantidad: 20,
    costo: 18_000,
    envioProv: 10_000,
    otrosCompra: 2_000,
    venta: 27_999, // margen fino
    envioCli: 4_000,
    otrosVenta: 200,
    pub: 600,
    mercado: [24_900, 26_500, 28_900, 25_900],
    provs: [
      ['demo-prov-3', 18_000, 30, 10_000, 10, '3 meses'],
      ['demo-prov-4', 21_500, 40, 5_000, 1, '6 meses'],
    ],
  },
  {
    c: 'drone',
    n: 'Dron con cámara',
    marca: 'DJI',
    mod: 'Mini 4K (demo)',
    cat: 'Drones',
    cantidad: 4,
    costo: 320_000,
    envioProv: 18_000,
    otrosCompra: 10_000,
    venta: 469_999,
    envioCli: 8_000,
    otrosVenta: 700,
    pub: 3_500,
    mercado: [449_000, 465_000], // mercado insuficiente (2 obs.)
    provs: [
      ['demo-prov-1', 320_000, 5, 18_000, 2, '12 meses'],
    ],
  },
  {
    c: 'gpu3060',
    n: 'Placa de video 12 GB',
    marca: 'NVIDIA',
    mod: 'RTX 3060 (demo)',
    cat: 'Hardware',
    cantidad: 4,
    costo: 0, // sin completar: el revendedor todavía no cotizó
    envioProv: 0,
    otrosCompra: 0,
    venta: 389_999,
    envioCli: 8_000,
    otrosVenta: 700,
    pub: 3_200,
    incompleto: true,
    mercado: [369_000, 385_000, 399_000, 378_000],
    provs: [['demo-prov-1', 0, 3, 18_000, 1, '12 meses']],
  },
];

// ---------------------------------------------------------------------------
// Construcción de los objetos finales
// ---------------------------------------------------------------------------
function construir(base, idx) {
  const clave = base.c;
  const condicion = base.condicion ?? 'nuevo';
  const fechaBase = hace(2 + (idx % 5));

  const observaciones = base.mercado.map((precio, i) => ({
    id: `demo-o-${clave}-${i}`,
    precio,
    vendedor: 'vendedor ficticio (DEMO)',
    url: `https://ejemplo.invalid/publicacion-demo-${clave}-${i}`,
    marca: base.marca,
    modelo: base.mod,
    caracteristicas: 'Publicación ficticia de prueba. No es un anuncio real.',
    condicion,
    accesorios: null,
    garantia: condicion === 'nuevo' ? 'De fábrica (ficticio)' : 'Sin garantía (ficticio)',
    envio: i % 3 === 0 ? 'a cargo' : 'gratis',
    fechaConsulta: hace((i % 6) + 1),
    origen: 'manual',
    fuente: null,
    refExternaId: null,
  }));

  const proveedores = (base.provs ?? []).map(([proveedorId, precioUnitario, stock, envio, minima, garantia]) => ({
    id: `demo-p-${clave}-${proveedorId}`,
    proveedorId,
    nombre: PROVEEDORES.find((p) => p.id === proveedorId)?.nombre ?? proveedorId,
    url: null,
    precioUnitario,
    stockDisponible: stock,
    envio,
    compraMinima: minima,
    garantia: garantia ?? null,
    observaciones: 'Términos ficticios de prueba.',
    fechaActualizacion: fechaBase,
  }));

  const incompleto = base.incompleto === true;
  const impPct = base.impPct ?? 0;

  const producto = {
    id: `demo-${clave}`,
    nombre: `[DEMO] ${base.n}`,
    marca: base.marca,
    modelo: base.mod,
    categoria: base.cat,
    caracteristicas:
      'DATOS DE PRUEBA FICTICIOS: precios inventados, no son precios reales de mercado.',
    proveedorPrincipal: proveedores[0]?.nombre ?? null,
    proveedorPrincipalId: proveedores[0]?.proveedorId ?? null,
    precioMinimoAceptable: incompleto ? null : Math.round(base.costo * 1.25),
    datos: {
      cantidad: base.cantidad,
      capitalDisponible: null,
      costosCompra: {
        // Un caso queda sin completar a propósito (DATOS_INCOMPLETOS).
        precioCompraUnitario: incompleto ? null : base.costo,
        envioProveedor: base.envioProv,
        otrosCostosAdquisicion: base.otrosCompra,
      },
      costosVenta: {
        precioVentaObjetivo: base.venta,
        comisionPorcentaje: 13,
        comisionMonto: null,
        envioCliente: base.envioCli,
        publicidadPorUnidad: base.pub,
        publicidadPresupuesto: null,
        impuestosPorcentaje: impPct,
        impuestosMonto: null,
        otrosCostosVenta: base.otrosVenta,
      },
    },
    proveedores,
    observaciones,
    simulacionPrecios: incompleto
      ? []
      : [
          Math.round(base.venta * 0.95),
          base.venta,
          Math.round(base.venta * 1.05),
        ],
    fuente: 'usuario',
    creadoEn: hace(30),
    actualizadoEn: fechaBase,
  };

  return producto;
}

const productos = [...P, ...P_SUCIOS].map(construir);

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------
const marcador =
  'DATOS DE PRUEBA FICTICIOS. Generados por scripts/generar-demo.mjs. ' +
  'No son precios reales ni provienen de Mercado Libre u otra fuente externa.';

const ts = `/* eslint-disable */
// ${marcador}
// Archivo GENERADO: no editar a mano. Regenerar con: node scripts/generar-demo.mjs
import { Producto } from '../core/models/producto.model';
import { ProveedorCatalogo } from '../core/models/proveedor.model';

export const AVISO_DEMO = '${marcador.replace(/'/g, "\\'")}';

export const PROVEEDORES_DEMO: ProveedorCatalogo[] = ${JSON.stringify(PROVEEDORES, null, 2)};

export const PRODUCTOS_DEMO: Producto[] = ${JSON.stringify(productos, null, 2)};
`;

const json = JSON.stringify(
  {
    aviso: marcador,
    generadoEn: ahora.toISOString(),
    proveedores: PROVEEDORES,
    productos,
  },
  null,
  2,
);

mkdirSync(join(raiz, 'src', 'app', 'demo'), { recursive: true });
writeFileSync(join(raiz, 'src', 'app', 'demo', 'datos-demo.ts'), ts, 'utf8');
writeFileSync(join(raiz, 'public', 'datos-demo.json'), json, 'utf8');

console.log(`OK: ${productos.length} productos de prueba y ${PROVEEDORES.length} proveedores ficticios.`);
console.log('  -> src/app/demo/datos-demo.ts');
console.log('  -> public/datos-demo.json');
