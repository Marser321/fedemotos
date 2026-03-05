import { getAdminDashboardData } from "@/lib/services";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getAdminDashboardData()
    .then((result) => ({
      ...result,
      initialError: undefined as string | undefined,
    }))
    .catch((error) => ({
      suscriptores: [],
      solicitudes: [],
      servicios: [],
      stats: {
        totalSuscriptores: 0,
        suscriptoresActivos: 0,
        auxiliosEsteMes: 0,
        facturacionMensual: 0,
        serviciosCompletados: 0,
      },
      initialError:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el panel de administración",
    }));

  return (
    <AdminClient
      initialSolicitudes={data.solicitudes}
      initialServicios={data.servicios}
      initialStats={data.stats}
      initialError={data.initialError}
    />
  );
}
