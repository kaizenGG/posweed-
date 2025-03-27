import useSWR from 'swr';

/**
 * Función fetcher para SWR que maneja las solicitudes a la API
 * @param url Dirección URL de la API a llamar
 * @returns Datos de la respuesta JSON
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Error fetching from ${url}: ${res.status} - ${errorText}`);
    throw new Error(`Error: ${res.status}`);
  }
  
  return res.json();
};

/**
 * Opciones SWR por defecto para la mayoría de las llamadas a la API
 */
export const defaultOptions = {
  dedupingInterval: 10000, // 10 segundos
  revalidateOnFocus: false,
  errorRetryCount: 3,
  errorRetryInterval: 3000,
  keepPreviousData: true
};

/**
 * Opciones SWR para datos que cambian con menos frecuencia
 */
export const stableDataOptions = {
  ...defaultOptions,
  dedupingInterval: 60000, // 1 minuto
};

/**
 * Procesa la respuesta de la API para extraer los datos relevantes
 * @param data Datos de respuesta de la API
 * @param key Clave de los datos (ejemplo: 'products', 'rooms', etc.)
 * @returns Array de elementos procesados
 */
export function processApiResponse<T>(data: any, key: string): T[] {
  // Si es null o undefined, devolver array vacío
  if (!data) return [];
  
  // Si ya es un array y tiene contenido, devolverlo
  if (Array.isArray(data)) return data as T[];
  
  // Si data.success es true y data[key] es un array, devolver ese array
  if (data.success === true && Array.isArray(data[key])) {
    return data[key] as T[];
  }
  
  // Si data[key] es un array (sin importar data.success), devolver ese array
  if (Array.isArray(data[key])) {
    return data[key] as T[];
  }
  
  // Si nada coincide, devolver array vacío
  return [];
}

export default useSWR; 