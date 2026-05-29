-- Fede Motos: Función atómica para solicitar auxilio mecánico
-- Esta función valida que el cliente tenga una membresía activa y auxilios restantes,
-- descuenta un auxilio e inserta la solicitud en la tabla auxilios de forma transaccional.
-- DEUDA SEGURIDAD: SECURITY DEFINER que confia en p_cliente_id del caller. Si anon
-- puede EXECUTE esta funcion via PostgREST RPC, un usuario podria crear auxilios y
-- descontar la membresia de CUALQUIER cliente. Hoy la ruta /api/auxilios pasa
-- session.sub, pero una llamada directa a la RPC lo saltea. Antes de exponer el
-- backend: validar p_cliente_id contra auth.uid() dentro de la funcion y/o revocar
-- EXECUTE a anon.

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
