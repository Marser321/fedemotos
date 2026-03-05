"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { LeafletMouseEvent, Map as LeafletMap } from "leaflet";

// Leaflet requiere acceso al DOM, lo cargamos dinámicamente sin SSR
const MapContainer = dynamic(
    () => import("react-leaflet").then((m) => m.MapContainer),
    {
        ssr: false,
        loading: () => (
            <div className="h-full w-full bg-fede-card rounded-2xl flex items-center justify-center border border-fede-border">
                <div className="flex flex-col items-center gap-2 text-fede-muted">
                    <div className="w-8 h-8 border-2 border-fede-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Cargando mapa...</span>
                </div>
            </div>
        ),
    }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((m) => m.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import("react-leaflet").then((m) => m.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then((m) => m.Popup),
    { ssr: false }
);

interface MapPin {
    id: string;
    lat: number;
    lng: number;
    label: string;
    description?: string;
    type?: "emergency" | "user" | "taller";
}

interface MapViewProps {
    center?: [number, number];
    zoom?: number;
    pins?: MapPin[];
    className?: string;
    height?: string;
    interactive?: boolean;
    selectedPin?: {
        lat: number;
        lng: number;
        label?: string;
        description?: string;
    };
    onMapClick?: (coords: { lat: number; lng: number }) => void;
}

export function MapView({
    center = [-34.8833, -56.1667],
    zoom = 13,
    pins = [],
    className = "",
    height = "h-64 sm:h-80",
    interactive = false,
    selectedPin,
    onMapClick,
}: MapViewProps) {
    const [map, setMap] = useState<LeafletMap | null>(null);

    useEffect(() => {
        if (!map || !onMapClick) return;
        const handleMapClick = (event: LeafletMouseEvent) => {
            onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
        };
        map.on("click", handleMapClick);
        return () => {
            map.off("click", handleMapClick);
        };
    }, [map, onMapClick]);

    return (
        <div className={`${height} ${className} rounded-2xl overflow-hidden border border-fede-border`}>
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                crossOrigin=""
            />
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={interactive}
                ref={(instance) => {
                    setMap(instance);
                }}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {pins.map((pin) => (
                    <Marker key={pin.id} position={[pin.lat, pin.lng]}>
                        <Popup>
                            <div className="text-black">
                                <strong>{pin.label}</strong>
                                {pin.description && <p className="text-sm mt-1">{pin.description}</p>}
                            </div>
                        </Popup>
                    </Marker>
                ))}
                {selectedPin && (
                    <Marker position={[selectedPin.lat, selectedPin.lng]}>
                        <Popup>
                            <div className="text-black">
                                <strong>{selectedPin.label || "Punto seleccionado"}</strong>
                                {selectedPin.description && (
                                    <p className="text-sm mt-1">{selectedPin.description}</p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
