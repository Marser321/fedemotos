import { z } from "zod";

const phoneSchema = z
  .string()
  .min(6, "Ingresá un número de teléfono válido")
  .max(24, "Teléfono demasiado largo");

export const adminLoginSchema = z.object({
  mode: z.literal("admin"),
  pin: z.string().min(4, "Ingresá el PIN de administrador"),
});

export const clienteLoginSchema = z.object({
  mode: z.literal("cliente"),
  telefono: phoneSchema,
});

export const registroSchema = z.object({
  nombre: z.string().min(2, "Ingresá tu nombre completo"),
  telefono: phoneSchema,
  email: z.string().email("Ingresá un email válido"),
  marca: z.string().min(1, "Ingresá la marca de tu moto"),
  modelo: z.string().min(1, "Ingresá el modelo de tu moto"),
});

export const verificarOtpSchema = z.object({
  purpose: z.enum(["registro", "login"]),
  telefono: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "El código debe tener 6 dígitos"),
});

export const crearAuxilioSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  descripcion: z.string().max(400).optional(),
});

export const actualizarAuxilioSchema = z.object({
  id: z.string().uuid("ID inválido"),
  estado: z.enum(["pendiente", "en_camino", "completado"]),
});

export const adminOperacionBaseSchema = z.object({
  tipo: z.enum(["auxilio", "traslado"]),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).default("media"),
  cliente: z.object({
    nombre: z.string().min(2, "Ingresá el nombre del cliente"),
    telefono: phoneSchema,
    email: z.string().email().optional(),
  }),
  vehiculo: z.object({
    id: z.string().uuid("ID de vehículo inválido").optional(),
    marca: z.string().min(1, "Ingresá la marca").optional(),
    modelo: z.string().min(1, "Ingresá el modelo").optional(),
  }),
  origen: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    referencia: z.string().max(240).optional(),
  }),
  destino: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      referencia: z.string().max(240).optional(),
    })
    .optional(),
  motivo: z.string().min(2, "Ingresá el motivo").max(500),
  notasInternas: z.string().max(1000).optional(),
});

export const adminCrearOperacionSchema = adminOperacionBaseSchema.superRefine(
  (input, ctx) => {
    if (input.tipo === "traslado" && !input.destino) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Destino obligatorio para traslados",
        path: ["destino"],
      });
    }

    const hasVehicleId = Boolean(input.vehiculo.id);
    const hasVehicleBrandModel = Boolean(input.vehiculo.marca && input.vehiculo.modelo);
    if (!hasVehicleId && !hasVehicleBrandModel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleccioná un vehículo existente o ingresá marca y modelo",
        path: ["vehiculo"],
      });
    }
  }
);

export const adminActualizarOperacionSchema = z.object({
  estado: z.enum(["pendiente", "en_camino", "completado"]).optional(),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).optional(),
  notasInternas: z.string().max(1000).optional(),
});

export const crearTurnoSchema = z.object({
  nombre: z.string().min(2, "Ingresá tu nombre"),
  telefono: phoneSchema,
  email: z.string().email().optional(),
  marca: z.string().min(1),
  modelo: z.string().min(1),
  kilometraje: z.string().min(1),
  fecha: z.string().min(1),
  horario: z.string().min(1),
  notas: z.string().max(600).optional().default(""),
});

export const crearSuscripcionSchema = z.object({
  nombre: z.string().min(2),
  telefono: phoneSchema,
  email: z.string().email(),
  marca: z.string().min(1),
  modelo: z.string().min(1),
  plan: z.enum(["basico", "premium"]),
});

export const editarSuscriptorSchema = z.object({
  _action: z.literal("edit"),
  id: z.string().uuid(),
  nombre: z.string().min(2).optional(),
  telefono: phoneSchema.optional(),
  email: z.string().email().optional(),
  plan: z.enum(["basico", "premium"]).optional(),
  estado: z.enum(["activo", "pendiente", "inactivo"]).optional(),
});

export const renovarSuscriptorSchema = z.object({
  _action: z.literal("renew"),
  id: z.string().uuid(),
});

export const membresiaVencimientoFilterSchema = z.enum([
  "vencida",
  "proxima",
  "activa",
  "inactiva",
  "todas",
]);

export const adminMembresiaPatchSchema = z.object({
  estado: z.enum(["activo", "pendiente", "inactivo"]).optional(),
  plan: z.enum(["basico", "premium"]).optional(),
  auxiliosRestantes: z.number().int().min(0).max(999).optional(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  contacto: z
    .object({
      nombre: z.string().min(2).optional(),
      telefono: phoneSchema.optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

export const adminSkipReminderSchema = z.object({
  reason: z.string().max(240).optional(),
});

export const adminClienteLookupQuerySchema = z.object({
  telefono: phoneSchema,
});

export const crearServicioSchema = z.object({
  clienteNombre: z.string().min(2),
  telefono: phoneSchema,
  marca: z.string().min(1),
  modelo: z.string().min(1),
  servicio: z.string().min(2),
  costo: z.number().min(0),
  kilometraje: z.number().min(0),
});

export const contactoCargaSchema = z.object({
  nombre: z.string().optional().default(""),
  telefono: z.string().optional().default(""),
  email: z.string().email().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
});

export const cargaMasivaSchema = z.object({
  contactos: z.array(contactoCargaSchema).max(500),
});

export const cronAuthorizationSchema = z.object({
  authorization: z.string().min(1),
});
