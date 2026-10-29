import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { MERCADO_CONFIG, MercadoConfig } from '../config/mercado.config';

const VENTANA_MS = 60_000;
const MAX_ENTRADAS_IP = 5000;

/**
 * Limite simple de consultas por IP y minuto (protege la fuente externa).
 * Configurable con `MERCADO_REQ_POR_MINUTO`. No usa dependencias externas.
 *
 * Nota: `req.ip` depende de que el proxy/hosting propague la IP real (p. ej. `trust proxy`).
 * Sin eso, todas las solicitudes pueden compartir la IP del proxy.
 */
@Injectable()
export class LimiteConsultasGuard implements CanActivate {
  private readonly accesos = new Map<string, number[]>();

  constructor(@Inject(MERCADO_CONFIG) private readonly config: MercadoConfig) {}

  canActivate(contexto: ExecutionContext): boolean {
    const req = contexto.switchToHttp().getRequest<{ ip?: string; socket?: { remoteAddress?: string } }>();
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'desconocido';
    const ahora = Date.now();
    this.podarSiHaceFalta(ahora);
    const previos = (this.accesos.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);

    if (previos.length >= this.config.reqPorMinuto) {
      this.accesos.set(ip, previos);
      throw new HttpException(
        {
          estado: 'limite',
          fuente: 'mercadolibre',
          publicaciones: [],
          total: 0,
          consultadoEn: new Date().toISOString(),
          mensaje: 'Demasiadas consultas. Intenta nuevamente en un minuto.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    previos.push(ahora);
    this.accesos.set(ip, previos);
    return true;
  }

  /** Evita que el mapa de IPs crezca sin limite en procesos de larga duracion. */
  private podarSiHaceFalta(ahora: number): void {
    if (this.accesos.size < MAX_ENTRADAS_IP) return;
    for (const [ip, marcas] of this.accesos) {
      if (marcas.every((t) => ahora - t >= VENTANA_MS)) this.accesos.delete(ip);
    }
  }
}
