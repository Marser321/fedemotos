import { AdminWorkdayHub } from "@/components/admin/AdminWorkdayHub";
import { getAdminWorkdayData } from "@/lib/services";
import type { AdminWorkdaySummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const result = await getAdminWorkdayData()
    .then((data) => ({ data, error: undefined as string | undefined }))
    .catch((error) => ({
      data: {
        stats: {
          totalSuscriptores: 0,
          suscriptoresActivos: 0,
          auxiliosEsteMes: 0,
          facturacionMensual: 0,
          serviciosCompletados: 0,
        },
        operacionesAbiertas: [],
        turnosHoy: [],
        ordenesActivas: [],
        recordatoriosPendientes: [],
        comunicacionesPendientes: [],
        alertas: [],
      } satisfies AdminWorkdaySummary,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el día operativo",
    }));

  return <AdminWorkdayHub data={result.data} error={result.error} />;
}
