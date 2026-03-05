import type { HelpProcedure, HelpProcedureId } from "@/lib/types";

export const HELP_TOUR_STORAGE_KEY = "fede-admin-help-tour";

const PROCEDURES: HelpProcedure[] = [
  {
    id: "operacion_general",
    title: "Como funciona el panel",
    summary: "Vista general para navegar operaciones, agenda, membresias y recordatorios.",
    assets: {
      screenshot: "/help/admin/overview/01-panel-general.png",
      animation: "/help/admin/animations/operacion-general.svg",
      alt: "Panel operativo con tabs principales",
    },
    checklist: [
      "Ver estado general del tablero y metricas del dia.",
      "Confirmar que la pestaña correcta esta seleccionada.",
      "Verificar que el boton Actualizar todo responde sin error.",
    ],
    steps: [
      {
        id: "general-tabs",
        title: "Tabs de operacion",
        description: "Estas pestañas cambian entre resumen, operaciones, membresias, agenda y recordatorios.",
        target: "admin-tabs",
      },
      {
        id: "general-refresh",
        title: "Actualizar datos",
        description: "Forza lectura del backend para validar informacion actualizada.",
        target: "admin-refresh",
      },
    ],
  },
  {
    id: "agenda_reserva",
    title: "Donde se agenda",
    summary: "Revision de estado de agenda, ocupacion diaria y turnos agendados.",
    assets: {
      screenshot: "/help/admin/agenda/01-ocupacion.png",
      animation: "/help/admin/animations/reserva-turno.svg",
      alt: "Panel de agenda con ocupacion por dia",
    },
    checklist: [
      "Estado de agenda en activa para aceptar reservas.",
      "Franja semanal habilitada en el dia objetivo.",
      "Turno visible en tabla luego de reservar.",
    ],
    steps: [
      {
        id: "agenda-tab",
        title: "Abrir Agenda",
        description: "Primero entramos al modulo Agenda para operar disponibilidad real.",
        target: "admin-tab-agenda",
        tab: "agenda",
      },
      {
        id: "agenda-status",
        title: "Estado operativo",
        description: "Controla si la agenda recibe turnos o esta pausada/deshabilitada.",
        target: "agenda-status-card",
        tab: "agenda",
      },
      {
        id: "agenda-ocupacion",
        title: "Ocupacion diaria",
        description: "Consulta slots libres, ocupados o bloqueados por fecha.",
        target: "agenda-day-occupancy",
        tab: "agenda",
      },
      {
        id: "agenda-turnos",
        title: "Turnos agendados",
        description: "Revisa y reprograma turnos desde la tabla operativa.",
        target: "agenda-turnos-table",
        tab: "agenda",
      },
    ],
  },
  {
    id: "agenda_pausar",
    title: "Como pausar agenda",
    summary: "Pausa temporal para cortar reservas sin perder configuracion.",
    assets: {
      screenshot: "/help/admin/agenda/02-pausa.png",
      animation: "/help/admin/animations/pausar-agenda.svg",
      alt: "Modulo de estado agenda en modo pausado",
    },
    checklist: [
      "Cambiar status a pausada.",
      "Definir motivo y fecha limite de pausa si aplica.",
      "Guardar estado y validar que acceptingBookings=false.",
    ],
    steps: [
      {
        id: "pause-status",
        title: "Seleccionar estado pausada",
        description: "Elegi pausada para bloquear nuevas reservas del cliente.",
        target: "agenda-status-card",
        tab: "agenda",
      },
      {
        id: "pause-save",
        title: "Guardar estado",
        description: "Persisti el cambio y refresca para verificar que quedo aplicado.",
        target: "agenda-status-save",
        tab: "agenda",
      },
    ],
  },
  {
    id: "agenda_reactivar",
    title: "Como reactivar agenda",
    summary: "Habilita nuevamente la recepcion de turnos luego de una pausa.",
    assets: {
      screenshot: "/help/admin/agenda/03-reactivar.png",
      animation: "/help/admin/animations/reactivar-agenda.svg",
      alt: "Estado agenda activa con recepcion de turnos",
    },
    checklist: [
      "Cambiar status a activa.",
      "Guardar configuracion.",
      "Validar en API publica que acceptingBookings=true.",
    ],
    steps: [
      {
        id: "reactivate-status",
        title: "Volver a activa",
        description: "En el mismo modulo de estado, selecciona activa.",
        target: "agenda-status-card",
        tab: "agenda",
      },
      {
        id: "reactivate-occupancy",
        title: "Revisar slots",
        description: "Confirma que los slots vuelven a mostrarse reservables en ocupacion diaria.",
        target: "agenda-day-occupancy",
        tab: "agenda",
      },
    ],
  },
  {
    id: "agenda_excepcion",
    title: "Crear excepcion",
    summary: "Bloquea u habilita rangos puntuales sin tocar la agenda semanal.",
    assets: {
      screenshot: "/help/admin/agenda/04-excepcion.png",
      animation: "/help/admin/animations/crear-excepcion.svg",
      alt: "Formulario de excepciones por fecha",
    },
    checklist: [
      "Definir fecha, tipo y rango horario.",
      "Guardar excepcion con motivo claro.",
      "Validar impacto inmediato en ocupacion del dia.",
    ],
    steps: [
      {
        id: "exception-form",
        title: "Formulario de excepcion",
        description: "Completa fecha, tipo, hora desde/hasta y motivo opcional.",
        target: "agenda-exceptions-form",
        tab: "agenda",
      },
      {
        id: "exception-list",
        title: "Lista de excepciones",
        description: "Comprueba que el registro aparece y puede eliminarse.",
        target: "agenda-exceptions-list",
        tab: "agenda",
      },
    ],
  },
  {
    id: "persistencia_check",
    title: "Verificar datos guardados",
    summary: "Chequeo rapido de persistencia read-after-write para evitar exitos falsos.",
    assets: {
      screenshot: "/help/admin/agenda/05-persistencia.png",
      animation: "/help/admin/animations/persistencia-confirmada.svg",
      alt: "Confirmacion visual de persistencia en agenda y turnos",
    },
    checklist: [
      "Aplicar un cambio (estado, excepcion o turno).",
      "Refrescar pantalla y verificar que el valor persiste.",
      "Corroborar API correspondiente sin cache y DB staging.",
    ],
    steps: [
      {
        id: "persist-action",
        title: "Ejecutar accion",
        description: "Realiza una accion en estado, excepciones o turnos.",
        target: "agenda-status-card",
        tab: "agenda",
      },
      {
        id: "persist-turnos",
        title: "Confirmar en lista",
        description: "Valida lectura posterior en la tabla de turnos.",
        target: "agenda-turnos-table",
        tab: "agenda",
      },
    ],
  },
];

export function listHelpProcedures(): HelpProcedure[] {
  return PROCEDURES;
}

export function getHelpProcedureById(id: HelpProcedureId): HelpProcedure | undefined {
  return PROCEDURES.find((item) => item.id === id);
}
