// =============================================================
// GEOZONE — Validación Geográfica de Zonas de Cobertura
// =============================================================

import { AppError } from "./errors";

// Coordenadas base de Fede Moto Servicios (Taller Central en Montevideo)
export const TALLER_LAT = -34.9011;
export const TALLER_LNG = -56.1645;

// Radio máximo de cobertura automática en kilómetros (40 km cubre Montevideo y zona metropolitana)
export const MAX_COVERAGE_RADIUS_KM = 40;

/**
 * Calcula la distancia en kilómetros entre dos coordenadas geográficas utilizando la fórmula Haversine.
 * Este método tiene costo $0 y no requiere llamadas a APIs externas.
 */
export function calcularDistanciaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en kilómetros
}

/**
 * Valida si una posición se encuentra dentro del rango de cobertura permitido.
 * Si no está en rango, arroja un error con información detallada para que el usuario
 * pueda solicitar asistencia manual.
 */
export function validarRangoCobertura(lat: number, lng: number): void {
  // Validación básica de coordenadas válidas
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new AppError("INVALID_COORDINATES", "Coordenadas geográficas inválidas", 400);
  }

  const distancia = calcularDistanciaKm(TALLER_LAT, TALLER_LNG, lat, lng);

  if (distancia > MAX_COVERAGE_RADIUS_KM) {
    throw new AppError(
      "OUT_OF_COVERAGE_RANGE",
      `Estás fuera de nuestra zona de cobertura automática (${MAX_COVERAGE_RADIUS_KM} km desde Montevideo). Tu distancia es de ${Math.round(
        distancia
      )} km. Podés solicitar auxilio comunicándote directamente con el taller para coordinar una tarifa de traslado por km excedente.`,
      403
    );
  }
}

/**
 * Genera el enlace de Google Maps para enviar al mecánico vía WhatsApp.
 */
export function obtenerGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Genera el enlace de Waze para navegación directa.
 */
export function obtenerWazeLink(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}
