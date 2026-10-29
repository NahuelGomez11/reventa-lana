# AGENTS.md

## Reglas para OpenCode (futuras sesiones)

- Leer BIBLIA.md y documentación relevante antes de trabajar.
- Inspeccionar código antes de modificarlo. No asumir estructura.
- No romper funcionalidades existentes.
- No inventar datos de mercado ni resultados financieros.
- No conectar servicios externos sin configuración real.
- No guardar secretos en repo.
- No ejecutar migraciones destructivas, borrar datos ni alterar DB sin autorización explícita.
- No ejecutar db push ni migraciones automáticas.
- No afirmar que prueba pasó si no se ejecutó.
- Documentar decisiones importantes y mantener estado del proyecto.
- No sobrescribir archivos importantes sin justificación.
- Datos ficticios deben identificarse; no pasar por reales.
- IA no recalcula finanzas ni modifica datos originales.
- Adaptadores demo claramente identificados.
- Precisión financiera: evitar igualdad decimal; considerar centavos/epsilon.
- No instalar herramientas globales sin necesidad.
- Solo commits remotos si explícitamente solicitado.
- Si decisión implica pérdida datos, costos externos, publicación o cambio irreversible -> pedir autorización.
- Usar herramientas disponibles, verificar resultados, corregir errores seguros.
- Alcance: solo lo autorizado. No simular integraciones externas como reales.
- Mantener separación dominio/presentación.
