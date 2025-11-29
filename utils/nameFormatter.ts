/**
 * Función helper para formatear nombres de usuario
 * Extrae solo el primer nombre y primer apellido
 */
export const formatShortName = (user: {
  nombre?: string;
  apellido?: string;
  nombres?: string;
  apellidos?: string;
  nombreCompleto?: string;
} | null | undefined): string => {
  if (!user) return 'Usuario';

  let primerNombre = '';
  let primerApellido = '';

  // Intentar obtener desde campos separados primero (nombres y apellidos)
  if (user.nombres) {
    primerNombre = user.nombres.split(' ')[0]; // Solo el primer nombre
  }
  if (user.apellidos) {
    primerApellido = user.apellidos.split(' ')[0]; // Solo el primer apellido
  }

  // Si no hay campos separados, intentar desde nombre/apellido
  if (!primerNombre && user.nombre) {
    primerNombre = user.nombre.split(' ')[0];
  }
  if (!primerApellido && user.apellido) {
    primerApellido = user.apellido.split(' ')[0];
  }

  // Si no hay campos separados, intentar desde nombreCompleto
  if (!primerNombre || !primerApellido) {
    const nombreFuente = user.nombreCompleto || user.nombre || '';
    const partesNombre = nombreFuente.trim().split(' ').filter(p => p.length > 0);
    if (!primerNombre && partesNombre.length > 0) {
      primerNombre = partesNombre[0];
    }
    if (!primerApellido && partesNombre.length > 1) {
      primerApellido = partesNombre[1]; // Primer apellido
    }
  }

  const nombreFormateado = primerApellido 
    ? `${primerNombre} ${primerApellido}`.trim()
    : primerNombre.trim();

  return nombreFormateado || 'Usuario';
};

