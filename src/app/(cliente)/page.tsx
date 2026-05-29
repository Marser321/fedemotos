"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { EmergencyButton } from "@/components/EmergencyButton";
import { MapView } from "@/components/MapView";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";
import {
  Shield,
  Clock,
  MapPin,
  Star,
  Cpu,
  Smartphone,
  Activity,
  ChevronRight,
  Phone,
  Mail,
  Map,
} from "lucide-react";
import type { GeoPosition } from "@/lib/geolocation";
import Link from "next/link";

function GoogleReviewsSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="px-4 pb-12 max-w-7xl mx-auto"
    >
      <div className="glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-t-2 border-t-fede-accent/50">
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
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 shadow-[0_0_20px_rgba(172,28,29,0.3)] hover:shadow-[0_0_30px_rgba(172,28,29,0.5)] transition-shadow"
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

export default function HomePage() {
  const [userPosition, setUserPosition] = useState<GeoPosition | null>(null);
  const supportWhatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || "59899123456";

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-fede-black overflow-x-hidden">
      {/* Header/Hero Section con Animación Interactiva */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-fede-border/30 pt-16">
        <InteractiveBackground />
        
        {/* Layout Responsive: Mobile vs Desktop */}
        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 px-4 py-12 w-full">
          {/* Columna Izquierda: Botón de Emergencia y Mapa (Móvil arriba, Desktop derecha visualmente) */}
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
                ¿Tu moto te dejó a pie? Tocá el botón y activamos asistencia con el móvil disponible más cercano.
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

          {/* Columna Derecha: Landing Premium Desktop */}
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
                Testeo en Computadora <span className="text-transparent bg-clip-text bg-gradient-to-r from-fede-accent to-white">Escáner Electrónico</span>
              </h2>

              <p className="text-fede-muted text-base lg:text-lg mb-8 leading-relaxed">
                Especialistas en <strong>alta cilindrada</strong>. Detectamos fallas ocultas antes de que te dejen en la ruta utilizando tecnología de diagnóstico digital de última generación.
              </p>

              <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl shadow-fede-accent/10 border border-white/10 mb-8">
                <Image
                  src="/moto_escaner.png"
                  alt="Motorcycle scanner diagnostics"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-fede-black via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className="bg-fede-accent/25 text-white border border-fede-accent/30 rounded-full font-semibold text-[10px] px-2.5 py-1 backdrop-blur-md">Alta Cilindrada</span>
                  <span className="bg-white/5 border border-white/10 text-white rounded-full font-medium text-[10px] px-2.5 py-1 backdrop-blur-md">Electrónica EFI</span>
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

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/agendar" className="btn-primary text-center py-4 px-8 font-semibold">
                  Agendar service
                </Link>
                <Link href="/suscripcion" className="btn-outline text-center py-4 px-8 font-semibold flex items-center justify-center gap-2">
                  Ver membresía
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Ventajas rápidas (Full Width) */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="px-4 py-16 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-fede-accent/15 flex items-center justify-center flex-shrink-0">
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
            <div className="w-12 h-12 rounded-lg bg-fede-accent/15 flex items-center justify-center flex-shrink-0">
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
            <div className="w-12 h-12 rounded-lg bg-fede-accent/15 flex items-center justify-center flex-shrink-0">
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

      {/* Sección Reseñas Google */}
      <GoogleReviewsSection />

      {/* NUEVA SECCIÓN: Ecosistema Todo-en-Uno */}
      <section className="px-4 py-16 border-t border-fede-border/20 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fede-accent/10 border border-fede-accent/20 text-fede-accent text-xs font-medium mb-4">
            Plataforma Digital Integral
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Todo lo que necesitás <span className="text-transparent bg-clip-text bg-gradient-to-r from-fede-accent to-white">en un solo lugar</span>
          </h2>
          <p className="text-fede-muted text-sm sm:text-base leading-relaxed">
            Hemos diseñado una app robusta que combina un portal comercial informativo, una app interactiva para el cliente, y un panel CRM avanzado para la administración interna de nuestro taller.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ y: -8 }}
            className="glass-card p-6 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-fede-accent/10 border border-fede-accent/20 flex items-center justify-center mb-6">
                <Cpu className="w-6 h-6 text-fede-accent" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">Web Comercial</h3>
              <p className="text-fede-muted text-xs sm:text-sm leading-relaxed mb-6">
                Información transparente de nuestros servicios técnicos, planes de membresía mensual a bajo costo y testimonios validados en tiempo real.
              </p>
            </div>
            <Link href="/suscripcion" className="text-fede-accent text-xs font-semibold inline-flex items-center gap-1.5 hover:underline">
              Explorar planes <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ y: -8 }}
            className="glass-card p-6 flex flex-col justify-between border-fede-accent/25"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-fede-accent/20 border border-fede-accent/40 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(172,28,29,0.2)]">
                <Smartphone className="w-6 h-6 text-fede-accent" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">App Web del Cliente</h3>
              <p className="text-fede-muted text-xs sm:text-sm leading-relaxed mb-6">
                Tu cuenta de usuario. Podés solicitar auxilio vial por geolocalización de forma directa, agendar turnos de mantenimiento preventivo y visualizar el estado actual de tus órdenes activas en el taller.
              </p>
            </div>
            <Link href="/registro" className="text-fede-accent text-xs font-semibold inline-flex items-center gap-1.5 hover:underline">
              Crear mi cuenta <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ y: -8 }}
            className="glass-card p-6 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-fede-accent/10 border border-fede-accent/20 flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-fede-accent" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">CRM de Taller (Admin)</h3>
              <p className="text-fede-muted text-xs sm:text-sm leading-relaxed mb-6">
                Nuestra mesa de operaciones digital. Controlamos auxilios en ruta abiertos, gestionamos la agenda diaria y registramos el diagnóstico, avance e historial de cada moto ingresada en el taller.
              </p>
            </div>
            <Link href="/login" className="text-fede-accent text-xs font-semibold inline-flex items-center gap-1.5 hover:underline">
              Acceso operador <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* NUEVA SECCIÓN: Servicios Especializados */}
      <section className="px-4 py-16 bg-zinc-950/30 border-t border-fede-border/20 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fede-accent/10 border border-fede-accent/20 text-fede-accent text-xs font-medium mb-4">
              Lo Que Hacemos
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Especialistas en <span className="text-fede-accent">alta cilindrada</span>
            </h2>
          </div>
          <p className="text-fede-muted max-w-md text-sm sm:text-base leading-relaxed">
            Equipamiento tecnológico avanzado y técnicos apasionados para cuidar tu moto como se lo merece.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 border border-white/5 hover:border-fede-accent/20 transition-all duration-300">
            <h3 className="font-bold text-sm sm:text-base mb-2 text-white">Diagnóstico Electrónico</h3>
            <p className="text-fede-muted text-xs sm:text-sm leading-relaxed">
              Escaneo completo en inyección EFI, ABS, control de tracción y sensores. Detectamos la falla exacta.
            </p>
          </div>

          <div className="glass-card p-5 border border-white/5 hover:border-fede-accent/20 transition-all duration-300">
            <h3 className="font-bold text-sm sm:text-base mb-2 text-white">Mecánica de Alta Complejidad</h3>
            <p className="text-fede-muted text-xs sm:text-sm leading-relaxed">
              Reparación y puesta a punto de motores pluricilíndricos, transmisiones, embragues y suspensiones.
            </p>
          </div>

          <div className="glass-card p-5 border border-white/5 hover:border-fede-accent/20 transition-all duration-300">
            <h3 className="font-bold text-sm sm:text-base mb-2 text-white">Electricidad e Instrumental</h3>
            <p className="text-fede-muted text-xs sm:text-sm leading-relaxed">
              Detección de fugas eléctricas, reparación de alternadores, baterías, encendido e instrumental digital.
            </p>
          </div>

          <div className="glass-card p-5 border border-white/5 hover:border-fede-accent/20 transition-all duration-300">
            <h3 className="font-bold text-sm sm:text-base mb-2 text-white">Auxilio Vial y Traslados</h3>
            <p className="text-fede-muted text-xs sm:text-sm leading-relaxed">
              Grúas con rampa y anclajes especiales para motos de gran porte. Traslados seguros en Montevideo y rutas.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Premium */}
      <footer className="bg-zinc-950/70 border-t border-fede-border/30 pt-16 pb-8 px-4 w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Logo y lema */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-fede-border flex items-center justify-center overflow-hidden">
                <Image
                  src="/branding/logo-rayo.png"
                  alt="Fede Motos"
                  width={22}
                  height={22}
                  className="object-contain"
                />
              </div>
              <span className="font-poppins font-bold text-base text-white tracking-tight">
                Fede <span className="text-fede-accent">Motos</span>
              </span>
            </div>
            <p className="text-fede-muted text-xs sm:text-sm max-w-sm leading-relaxed">
              Asistencia vial instantánea y taller de diagnóstico digital de alta cilindrada. Tu tranquilidad en la ruta es nuestro objetivo principal.
            </p>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h4 className="font-bold text-sm mb-4 text-white uppercase tracking-wider">Enlaces Útiles</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link href="/" className="text-fede-muted hover:text-white transition-colors">
                  Solicitar Auxilio
                </Link>
              </li>
              <li>
                <Link href="/suscripcion" className="text-fede-muted hover:text-white transition-colors">
                  Planes de Membresía
                </Link>
              </li>
              <li>
                <Link href="/agendar" className="text-fede-muted hover:text-white transition-colors">
                  Agendar Service
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-fede-muted hover:text-white transition-colors">
                  Iniciar Sesión
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-bold text-sm mb-4 text-white uppercase tracking-wider">Contacto</h4>
            <ul className="space-y-3 text-xs sm:text-sm">
              <li className="flex items-start gap-2 text-fede-muted">
                <Phone className="w-4 h-4 text-fede-accent flex-shrink-0 mt-0.5" />
                <a href={`https://wa.me/${supportWhatsapp}`} className="hover:text-white transition-colors">
                  WhatsApp Soporte
                </a>
              </li>
              <li className="flex items-start gap-2 text-fede-muted">
                <Mail className="w-4 h-4 text-fede-accent flex-shrink-0 mt-0.5" />
                <span>contacto@fedemotos.uy</span>
              </li>
              <li className="flex items-start gap-2 text-fede-muted">
                <Map className="w-4 h-4 text-fede-accent flex-shrink-0 mt-0.5" />
                <span>Montevideo, Uruguay</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-fede-border/20 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-fede-muted">
          <p>© {new Date().getFullYear()} Fede Motos Servicios. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <span className="hover:text-white cursor-pointer transition-colors">Términos de servicio</span>
            <span className="hover:text-white cursor-pointer transition-colors">Política de privacidad</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
