-- Fede Motos: endurecimiento de seguridad y políticas RLS
-- Esta migración cierra las brechas de seguridad eliminando las políticas anon_all,
-- configurando políticas de lectura segura para la agenda y blindando la función de auxilio.

-- 1. Eliminar políticas inseguras abiertas a anon en tablas críticas
DROP POLICY IF EXISTS recordatorios_anon_all ON public.recordatorios_operativos;
DROP POLICY IF EXISTS agenda_config_anon_all ON public.agenda_configuracion;
DROP POLICY IF EXISTS agenda_weekly_anon_all ON public.agenda_franjas_semanales;
DROP POLICY IF EXISTS agenda_excepciones_anon_all ON public.agenda_excepciones;
DROP POLICY IF EXISTS ordenes_taller_anon_all ON public.ordenes_taller;
DROP POLICY IF EXISTS ordenes_taller_eventos_anon_all ON public.ordenes_taller_eventos;

-- 2. Crear políticas de lectura pública seguras (sólo SELECT) para la agenda.
-- El frontend de clientes necesita consultar la disponibilidad, franjas y configuraciones para agendar.
CREATE POLICY agenda_config_select_public
  ON public.agenda_configuracion
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY agenda_weekly_select_public
  ON public.agenda_franjas_semanales
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY agenda_excepciones_select_public
  ON public.agenda_excepciones
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Nota: Las tablas recordatorios_operativos, ordenes_taller y ordenes_taller_eventos 
-- mantienen RLS activado pero sin políticas para anon o authenticated,
-- bloqueando todo acceso directo desde PostgREST para clientes externos.

-- 3. Blindar la función RPC request_aid
CREATE OR REPLACE FUNCTION public.request_aid(
    p_cliente_id UUID,
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_descripcion TEXT
)
RETURNS UUID AS $$
DECLARE
    v_membresia_id UUID;
    v_auxilios_restantes INT;
    v_vehiculo_id UUID;
    v_auxilio_id UUID;
BEGIN
    -- VALIDACIÓN DE SEGURIDAD HÍBRIDA:
    -- Si es invocado por un usuario de app (anon/authenticated), validar que coincida con su auth.uid()
    -- Si es invocado por backend (service_role), permitir cualquier ID de cliente
    IF auth.role() <> 'service_role' AND (auth.uid() IS NULL OR auth.uid() <> p_cliente_id) THEN
        RAISE EXCEPTION 'Operación no autorizada.' USING ERRCODE = '42501';
    END IF;

    -- 1. Buscar membresía activa del cliente bloqueando la fila para evitar condiciones de carrera (race conditions)
    SELECT id, auxilios_restantes INTO v_membresia_id, v_auxilios_restantes
    FROM public.membresias
    WHERE cliente_id = p_cliente_id AND estado = 'activo'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No tenés una membresía activa para solicitar auxilio' USING ERRCODE = 'P0002';
    END IF;

    -- 2. Validar auxilios disponibles
    IF v_auxilios_restantes <= 0 THEN
        RAISE EXCEPTION 'Has agotado tus 3 auxilios mensuales. Podés contratar un auxilio extra comunicándote con el taller.' USING ERRCODE = 'P0003';
    END IF;

    -- 3. Obtener el último vehículo registrado del cliente
    SELECT id INTO v_vehiculo_id
    FROM public.vehiculos
    WHERE cliente_id = p_cliente_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- 4. Insertar el auxilio
    INSERT INTO public.auxilios (
        cliente_id,
        vehiculo_id,
        tipo,
        prioridad,
        latitud,
        longitud,
        origen_referencia,
        descripcion_problema,
        estado,
        creado_desde
    )
    VALUES (
        p_cliente_id,
        v_vehiculo_id,
        'auxilio',
        'media',
        p_lat,
        p_lng,
        'Ubicación compartida por cliente',
        p_descripcion,
        'pendiente',
        'app_cliente'
    )
    RETURNING id INTO v_auxilio_id;

    -- 5. Decrementar los auxilios restantes
    UPDATE public.membresias
    SET auxilios_restantes = auxilios_restantes - 1
    WHERE id = v_membresia_id;

    RETURN v_auxilio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Revocar privilegios públicos e intermedios de ejecución
REVOKE EXECUTE ON FUNCTION public.request_aid(UUID, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
-- Conceder privilegios explícitos a service_role y postgres (Superuser/Next.js backend)
GRANT EXECUTE ON FUNCTION public.request_aid(UUID, NUMERIC, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_aid(UUID, NUMERIC, NUMERIC, TEXT) TO postgres;
