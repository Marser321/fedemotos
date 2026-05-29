import { z } from "zod";

const phoneSchema = z
  .string()
  .min(6, "Ingresá un número de teléfono válido")
  .max(24, "Teléfono demasiado largo");

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida");

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

export const ordenEstadoSchema = z.enum([
  "ingresado",
  "diagnostico",
  "espera_repuestos",
  "reparacion",
  "listo",
  "entregado",
  "cancelado",
]);

export const adminCrearOrdenSchema = z
  .object({
    cliente: z.object({
      nombre: z.string().min(2, "Ingresá el nombre del cliente"),
      telefono: phoneSchema,
      email: z.string().email().optional(),
    }),
    vehiculo: z.object({
      id: z.string().uuid("ID de vehículo inválido").optional(),
      marca: z.string().min(1, "Ingresá la marca").optional(),
      modelo: z.string().min(1, "Ingresá el modelo").optional(),
      kilometraje: z.number().int().min(0).optional(),
    }),
    turnoId: z.string().uuid("ID de turno inválido").optional(),
    titulo: z.string().min(2, "Ingresá el trabajo a realizar").max(160),
    descripcion: z.string().max(1200).optional(),
    diagnostico: z.string().max(1200).optional(),
    notasInternas: z.string().max(1200).optional(),
    costoEstimado: z.number().min(0).optional(),
    fechaPrometida: dateSchema.optional(),
  })
  .superRefine((input, ctx) => {
    const hasVehicleId = Boolean(input.vehiculo.id);
    const hasVehicleBrandModel = Boolean(input.vehiculo.marca && input.vehiculo.modelo);
    if (!hasVehicleId && !hasVehicleBrandModel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleccioná un vehículo existente o ingresá marca y modelo",
        path: ["vehiculo"],
      });
    }
  });

export const adminActualizarOrdenSchema = z.object({
  estado: ordenEstadoSchema.optional(),
  titulo: z.string().min(2).max(160).optional(),
  descripcion: z.string().max(1200).nullable().optional(),
  diagnostico: z.string().max(1200).nullable().optional(),
  notasInternas: z.string().max(1200).nullable().optional(),
  costoEstimado: z.number().min(0).optional(),
  costoFinal: z.number().min(0).optional(),
  fechaPrometida: dateSchema.nullable().optional(),
});

export const crearTurnoSchema = z.object({
  nombre: z.string().min(2, "Ingresá tu nombre"),
  telefono: phoneSchema,
  email: z.string().email().optional(),
  marca: z.string().min(1),
  modelo: z.string().min(1),
  kilometraje: z.string().min(1),
  fecha: dateSchema,
  horario: timeSchema,
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

export const agendaDisponibilidadQuerySchema = z.object({
  fecha: dateSchema,
});

export const adminAgendaConfigPatchSchema = z
  .object({
    status: z.enum(["activa", "pausada", "deshabilitada"]).optional(),
    pauseReason: z.string().max(240).nullable().optional(),
    pauseUntil: z.string().datetime({ offset: true }).nullable().optional(),
    minDaysAhead: z.number().int().min(0).max(120).optional(),
    maxDaysAhead: z.number().int().min(0).max(120).optional(),
    slotDurationMinutes: z.number().int().min(30).max(120).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      typeof data.minDaysAhead === "number" &&
      typeof data.maxDaysAhead === "number" &&
      data.maxDaysAhead < data.minDaysAhead
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "maxDaysAhead debe ser mayor o igual a minDaysAhead",
        path: ["maxDaysAhead"],
      });
    }
  });

export const adminAgendaWeeklyRuleSchema = z.object({
  id: z.string().uuid().optional(),
  dayOfWeek: z.number().int().min(1).max(7),
  enabled: z.boolean(),
  startTime: timeSchema,
  endTime: timeSchema,
});

export const adminAgendaWeeklyPutSchema = z
  .object({
    rules: z.array(adminAgendaWeeklyRuleSchema).min(1).max(50),
  })
  .superRefine((data, ctx) => {
    for (const rule of data.rules) {
      if (rule.startTime >= rule.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La hora de inicio debe ser menor que la hora de fin",
          path: ["rules"],
        });
      }
    }
  });

export const adminAgendaExceptionCreateSchema = z
  .object({
    fecha: dateSchema,
    tipo: z.enum(["bloqueo", "habilitacion"]),
    horaDesde: timeSchema,
    horaHasta: timeSchema,
    motivo: z.string().max(240).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.horaDesde >= data.horaHasta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La hora desde debe ser menor que la hora hasta",
        path: ["horaHasta"],
      });
    }
  });

export const adminAgendaTurnoPatchSchema = z
  .object({
    estado: z.enum(["pendiente", "en_proceso", "completado", "cancelado"]).optional(),
    fecha: dateSchema.optional(),
    hora: timeSchema.optional(),
    notas: z.string().max(600).optional(),
  })
  .superRefine((data, ctx) => {
    const hasFecha = typeof data.fecha === "string";
    const hasHora = typeof data.hora === "string";
    if (hasFecha !== hasHora) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Para reprogramar debés enviar fecha y hora juntas",
        path: ["fecha"],
      });
    }
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
