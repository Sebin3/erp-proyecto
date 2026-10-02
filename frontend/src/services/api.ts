// Punto único para las futuras llamadas a la API REST de FastAPI (/api/v1).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
