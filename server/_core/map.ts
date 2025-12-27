/**
 * DEPRECATED: Manus/Forge Google Maps Proxy
 * 
 * Este módulo foi desabilitado pois dependia da infraestrutura Manus/Forge.
 * Para usar Google Maps APIs diretamente, configure sua própria chave:
 * - Google Cloud Console -> APIs & Services -> Credentials
 * - Habilite: Geocoding, Directions, Places, etc
 */

// ============================================================================
// Type Definitions (mantidas para compatibilidade)
// ============================================================================

export type TravelMode = "driving" | "walking" | "bicycling" | "transit";
export type MapType = "roadmap" | "satellite" | "terrain" | "hybrid";
export type SpeedUnit = "KPH" | "MPH";

export type LatLng = {
  lat: number;
  lng: number;
};

export type DirectionsResult = {
  routes: Array<{
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      start_address: string;
      end_address: string;
    }>;
    overview_polyline: { points: string };
    summary: string;
  }>;
  status: string;
};

export type GeocodingResult = {
  results: Array<{
    formatted_address: string;
    geometry: {
      location: LatLng;
    };
    place_id: string;
  }>;
  status: string;
};

export type PlacesSearchResult = {
  results: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: { location: LatLng };
    rating?: number;
  }>;
  status: string;
};

interface RequestOptions {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
}

/**
 * Placeholder for Google Maps API requests.
 * Configure your own Google Maps API key for direct access.
 */
export async function makeRequest<T = unknown>(
  endpoint: string,
  params: Record<string, unknown> = {},
  options: RequestOptions = {}
): Promise<T> {
  throw new Error(
    `Google Maps API não disponível. A integração com Manus/Forge foi removida. ` +
    `Para usar o endpoint "${endpoint}", configure uma chave Google Maps própria.`
  );
}
