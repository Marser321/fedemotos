#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const connectionString = process.env.DATABASE_URL || process.argv[2];

if (!connectionString) {
  console.error("Error: Se requiere una cadena de conexión a PostgreSQL.");
  console.error("Uso: node scripts/apply-sql-pg.mjs <CONNECTION_STRING>");
  console.error("O bien define la variable de entorno DATABASE_URL.");
  process.exit(1);
}

const sqlFiles = [
  "0001_fede_motos_schema.sql",
  "0002_operativa_auxilios_membresias_recordatorios.sql",
  "0003_agenda_operativa.sql",
  "0004_request_aid_rpc.sql",
  "0005_ordenes_taller.sql",
  "0006_harden_security.sql",
  "0007_comunicaciones_operativas.sql",
];

const infraSqlDir = path.join(process.cwd(), "infra", "sql");

async function run() {
  const { Client } = pg;
  const client = new Client({
    connectionString,
    ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    console.log("Conectando a la base de datos...");
    await client.connect();
    console.log("Conexión establecida exitosamente.\n");

    for (const file of sqlFiles) {
      const filePath = path.join(infraSqlDir, file);
      console.log(`Leyendo archivo: ${file}...`);
      const sqlContent = await fs.readFile(filePath, "utf8");

      console.log(`Ejecutando sentencias de ${file}...`);
      await client.query(sqlContent);
      console.log(`¡Archivo ${file} aplicado con éxito!\n`);
    }

    console.log("Todos los esquemas SQL se han aplicado correctamente en la nueva base de datos limpia.");
  } catch (error) {
    console.error("Error al aplicar los esquemas SQL:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
