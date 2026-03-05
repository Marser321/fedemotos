// =============================================================
// GEOLOCATION — Wrapper para API de Geolocalización HTML5
// =============================================================

export interface GeoPosition {
    lat: number;
    lng: number;
    accuracy: number;
}

export function getCurrentPosition(): Promise<GeoPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Tu navegador no soporta geolocalización"));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error("Permiso de ubicación denegado. Activá la ubicación para solicitar auxilio."));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error("No se pudo determinar tu ubicación. Intentá de nuevo."));
                        break;
                    case error.TIMEOUT:
                        reject(new Error("La solicitud de ubicación expiró. Intentá de nuevo."));
                        break;
                    default:
                        reject(new Error("Error desconocido al obtener la ubicación."));
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    });
}
