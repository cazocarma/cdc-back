import sql from "mssql";

type SqlErrorDetails = {
  status: number;
  message: string;
};

export function mapSqlError(error: unknown): SqlErrorDetails | null {
  if (!(error instanceof sql.RequestError)) {
    return null;
  }

  const code = Number((error as { number?: unknown }).number ?? 0);

  switch (code) {
    case 2601:
    case 2627:
      return { status: 409, message: "Ya existe un registro con esos datos unicos." };
    case 547:
      return { status: 409, message: "No se puede completar la operacion por integridad referencial." };
    case 515:
      return { status: 422, message: "Faltan datos obligatorios para la operacion solicitada." };
    case 245:
    case 8114:
    case 241:
      return { status: 422, message: "Formato de datos invalido para uno o mas campos." };
    case 8152:
    case 2628:
      return { status: 422, message: "Uno o mas campos superan el tamano permitido." };
    default:
      return { status: 400, message: "Error SQL al procesar la solicitud." };
  }
}
