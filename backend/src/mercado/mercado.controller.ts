import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MERCADO_CONFIG, MercadoConfig } from '../config/mercado.config';
import { ResultadoBusquedaMercado } from './contrato';
import { LimiteConsultasGuard } from './limite-consultas.guard';
import { MercadoService } from './mercado.service';

const SITIO_VALIDO = /^ML[A-Z]$/;
const MAX_LARGO_Q = 120;

@Controller('market')
@UseGuards(LimiteConsultasGuard)
export class MercadoController {
  constructor(
    private readonly service: MercadoService,
    @Inject(MERCADO_CONFIG) private readonly config: MercadoConfig,
  ) {}

  /**
   * GET /market/search?q=&site_id=&limit=
   * Respuesta: contrato de `./contrato` (mismo que consume el frontend Angular).
   */
  @Get('item')
  async obtenerItem(@Query('item_id') itemId?: string): Promise<ResultadoBusquedaMercado> {
    const id = (itemId ?? '').trim();
    if (id === '') {
      throw new BadRequestException('Falta el parametro "item_id" (ej.: MLA123456789).');
    }
    if (id.length > 40) {
      throw new BadRequestException('El parametro "item_id" es demasiado largo.');
    }
    return this.service.obtenerItem(id);
  }

  @Get('search')
  async buscar(
    @Query('q') q?: string,
    @Query('site_id') siteId?: string,
    @Query('limit') limit?: string,
  ): Promise<ResultadoBusquedaMercado> {
    const texto = (q ?? '').trim();
    if (texto === '') {
      throw new BadRequestException('Falta el parametro de busqueda "q".');
    }
    if (texto.length > MAX_LARGO_Q) {
      throw new BadRequestException(
        `El parametro "q" no puede superar los ${MAX_LARGO_Q} caracteres.`,
      );
    }

    const sitio = (siteId ?? this.config.siteId).trim();
    if (!SITIO_VALIDO.test(sitio)) {
      throw new BadRequestException('El parametro "site_id" no es valido (ej.: MLA).');
    }

    let limite = this.config.maxResultados;
    if (limit != null && limit.trim() !== '') {
      const n = Number(limit);
      if (!Number.isInteger(n) || n < 1 || n > this.config.maxResultados) {
        throw new BadRequestException(
          `El parametro "limit" debe ser un entero entre 1 y ${this.config.maxResultados}.`,
        );
      }
      limite = n;
    }

    return this.service.buscar({ q: texto, siteId: sitio, limite, marca: null, modelo: null });
  }
}
