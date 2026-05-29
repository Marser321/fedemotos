import { describe, expect, it } from "vitest";
import {
  calcularDistanciaKm,
  validarRangoCobertura,
  TALLER_LAT,
  TALLER_LNG,
} from "../geozone";
import { AppError } from "../errors";

describe("geozone helper", () => {
  it("calcula correctamente la distancia entre dos puntos", () => {
    // Distancia desde el taller central hasta el Obelisco de Montevideo (aprox 3.5 km)
    const obeliscoLat = -34.8973;
    const obeliscoLng = -56.1642;
    const dist = calcularDistanciaKm(TALLER_LAT, TALLER_LNG, obeliscoLat, obeliscoLng);
    expect(dist).toBeGreaterThan(0.1);
    expect(dist).toBeLessThan(5);
  });

  it("permite coordenadas dentro del radio de 40 km", () => {
    // Ciudad de la Costa (aprox 20 km del centro)
    const ciudadDeLaCostaLat = -34.8252;
    const ciudadDeLaCostaLng = -55.9723;
    
    expect(() => validarRangoCobertura(ciudadDeLaCostaLat, ciudadDeLaCostaLng)).not.toThrow();
  });

  it("arroja error para coordenadas fuera del radio de 40 km", () => {
    // Punta del Este (aprox 110 km del centro de Montevideo)
    const puntaDelEsteLat = -34.9631;
    const puntaDelEsteLng = -54.9439;

    expect(() => validarRangoCobertura(puntaDelEsteLat, puntaDelEsteLng)).toThrowError(
      /zona de cobertura automática/
    );
    
    try {
      validarRangoCobertura(puntaDelEsteLat, puntaDelEsteLng);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(403);
      expect((err as AppError).code).toBe("OUT_OF_COVERAGE_RANGE");
    }
  });

  it("arroja error para coordenadas inválidas", () => {
    expect(() => validarRangoCobertura(NaN, 12)).toThrowError(/Coordenadas geográficas inválidas/);
    expect(() => validarRangoCobertura(-95, 120)).toThrowError(/Coordenadas geográficas inválidas/);
    expect(() => validarRangoCobertura(-34, 190)).toThrowError(/Coordenadas geográficas inválidas/);
  });
});
