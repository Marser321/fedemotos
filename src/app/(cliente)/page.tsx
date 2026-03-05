"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { EmergencyButton } from "@/components/EmergencyButton";
import { MapView } from "@/components/MapView";
import { Shield, Clock, MapPin, Star } from "lucide-react";

function GoogleReviewsSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="px-4 pb-12 max-w-7xl mx-auto"
    >
      <div className="glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-t-2 border-t-red-500/50">
        <div className="flex-1 text-center md:text-left relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-medium mb-4">
            <Star className="w-3.5 h-3.5 fill-current" />
            Reputación Comprobada
          </div>
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            El taller mecánico mejor puntuado en <span className="text-fede-accent">Google</span>
          </h2>
          <p className="text-fede-muted mb-6 max-w-lg mx-auto md:mx-0">
            Cientos de motociclistas confían en nosotros. Leé sus experiencias y enterate por qué somos la primera opción para motos de alta cilindrada.
          </p>
          <a
            href="https://maps.app.goo.gl/NZdm8AWbeF6P9JNM7" target="_blank" rel="noreferrer"
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-shadow"
          >
            Dejar mi opinión
          </a>
        </div>

        <div className="flex-1 w-full flex flex-col gap-4 relative z-10">
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.2 }}
            className="glass-card p-5 bg-white/5 border border-white/10 relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 transition-transform duration-500 group-hover:scale-110">
              <Star className="w-32 h-32" />
            </div>
            <div className="flex text-yellow-500 mb-2 relative z-10">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-sm italic text-neutral-300 mb-3 relative z-10">
              &ldquo;Brillante la atención de Fede. Le llevé mi Kawasaki y en un par de días detectó el problema eléctrico con el escáner. ¡Super recomendables!&rdquo;
            </p>
            <p className="text-xs font-bold text-white relative z-10">— Carlos M.</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.2 }}
            className="glass-card p-5 bg-white/5 border border-white/10 relative overflow-hidden group ml-0 md:ml-8 cursor-pointer"
          >
            <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 -rotate-12 transition-transform duration-500 group-hover:scale-110">
              <Star className="w-32 h-32" />
            </div>
            <div className="flex text-yellow-500 mb-2 relative z-10">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-sm italic text-neutral-300 mb-3 relative z-10">
              &ldquo;Me quedé tirado en la ruta y el auxilio llegó Rapidísimo. La membresía la pago feliz con lo tranqui que ando ahora.&rdquo;
            </p>
            <p className="text-xs font-bold text-white relative z-10">— Florencia G.</p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

import type { GeoPosition } from "@/lib/geolocation";
import Link from "next/link";

export default function HomePage() {
  const [userPosition, setUserPosition] = useState<GeoPosition | null>(null);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Layout Responsive: Mobile vs Desktop */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 px-4 pt-8 lg:pt-16 pb-12">

        {/* Columna Izquierda: Botón Móvil (arriba) / Hero Desktop (arriba visualmente en md) */}
        <div className="flex flex-col items-center lg:items-start justify-center order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center lg:items-start gap-2 mb-8 text-center lg:text-left"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold leading-tight">
              <span className="text-fede-accent block lg:inline">Auxilio</span> de Emergencia
            </h1>
            <p className="text-fede-muted text-sm sm:text-base max-w-md lg:max-w-lg mt-2 lg:mt-4">
              ¿Tu moto te dejó a pie? Tocá el botón y te localizamos al instante con el móvil más cercano.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <EmergencyButton onLocationCapture={setUserPosition} />
          </motion.div>

          {userPosition && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-sm lg:max-w-md"
            >
              <MapView
                height="h-48 sm:h-56 lg:h-64"
                center={[userPosition.lat, userPosition.lng]}
                zoom={15}
                pins={[
                  {
                    id: "user",
                    lat: userPosition.lat,
                    lng: userPosition.lng,
                    label: "Tu ubicación",
                    description: "Auxilio solicitado",
                    type: "user",
                  },
                ]}
              />
            </motion.div>
          )}
        </div>

        {/* Columna Derecha: Landing Premium Desktop (abajo en mobile, izquierda en desktop) */}
        <div className="flex flex-col justify-center order-2 lg:order-1 pt-8 border-t border-fede-border/50 lg:border-t-0 lg:pr-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fede-accent/10 border border-fede-accent/20 text-fede-accent text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-fede-accent animate-pulse" />
              Servicio Premium Exclusivo
            </div>

            <h2 className="text-3xl lg:text-5xl font-bold leading-tight mb-6">
              Testeo en Computadora <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white">Escáner Electrónico</span>
            </h2>

            <p className="text-fede-muted text-base lg:text-lg mb-8 leading-relaxed">
              Especialistas en <strong>alta cilindrada</strong>. Detectamos fallas ocultas antes de que te dejen en la ruta utilizando tecnología de diagnóstico digital de última generación.
            </p>

            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-red-500/10 border border-fede-border/50 mb-8 blur-[0.2px]">
              <Image
                src="/moto_escaner.png"
                alt="Motorcycle scanner diagnostics"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-fede-black via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className="badge-active bg-red-500 text-white text-[10px] px-2 py-1">Alta Cilindrada</span>
                <span className="badge-inactive border-neutral-600 text-white text-[10px] px-2 py-1">Electrónica EFI</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="glass-card p-4 flex flex-col gap-2">
                <Shield className="w-6 h-6 text-fede-accent" />
                <h3 className="font-semibold text-sm">Prevención Total</h3>
                <p className="text-xs text-fede-muted">Diagnóstico exacto en inyección, ABS y sensores.</p>
              </div>
              <div className="glass-card p-4 flex flex-col gap-2">
                <Clock className="w-6 h-6 text-fede-accent" />
                <h3 className="font-semibold text-sm">Ahorro a futuro</h3>
                <p className="text-xs text-fede-muted">Detectar a tiempo evita roturas del motor costosas.</p>
              </div>
            </div>

            <Link href="/agendar" className="btn-primary w-full sm:w-auto px-8 py-4 text-center inline-block">
              Agendar Diagnóstico
            </Link>
          </motion.div>
        </div>

      </div>

      {/* Sección Reseñas Google */}
      <GoogleReviewsSection />

      {/* Ventajas rápidas (Full Width) */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="px-4 pb-12 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-fede-accent/15 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-fede-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-sm lg:text-base">GPS Preciso en Ruta</h3>
              <p className="text-fede-muted text-xs lg:text-sm mt-1">
                Te localizamos al metro con o sin dirección
              </p>
            </div>
          </div>

          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-fede-accent/15 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-fede-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-sm lg:text-base">Respuesta Veloz</h3>
              <p className="text-fede-muted text-xs lg:text-sm mt-1">
                Asistencia en sitio en menos de 30 mins
              </p>
            </div>
          </div>

          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-fede-accent/15 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-fede-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-sm lg:text-base">Plan de Membresía</h3>
              <p className="text-fede-muted text-xs lg:text-sm mt-1">
                3 Auxilios mensuales incluidos en tu plan
              </p>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
