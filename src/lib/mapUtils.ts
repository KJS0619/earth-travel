import type { CruiseWaypoint, PortStatus } from '@/types';
import { DEFAULT_ROUTE_COORDS } from '@/constants';

/**
 * Haversine formula for calculating distance between two coordinates
 */
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

/**
 * Generate curved segment between two points using quadratic bezier
 */
export function generateCurvedSegment(
  start: [number, number],
  end: [number, number],
  curvature: number = 0.08,
  numPoints: number = 25
): [number, number][] {
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;
  const pts: [number, number][] = [];

  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const perpLat = -dx * curvature;
  const perpLng = dy * curvature;
  const ctrlLat = midLat + perpLat;
  const ctrlLng = midLng + perpLng;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const inv = 1 - t;
    const lat = inv * inv * lat1 + 2 * inv * t * ctrlLat + t * t * lat2;
    const lng = inv * inv * lng1 + 2 * inv * t * ctrlLng + t * t * lng2;
    pts.push([lat, lng]);
  }
  return pts;
}

/**
 * Generate multi-stop route with curved segments
 */
export function generateMultiStopRoute(
  waypoints: CruiseWaypoint[],
  curvature: number = 0.08
): [number, number][] {
  if (!Array.isArray(waypoints) || waypoints.length < 2) return DEFAULT_ROUTE_COORDS;

  const allPoints: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1: [number, number] = [waypoints[i].lat, waypoints[i].lng];
    const p2: [number, number] = [waypoints[i + 1].lat, waypoints[i + 1].lng];
    const segment = generateCurvedSegment(p1, p2, curvature, 25);
    if (i > 0) segment.shift();
    allPoints.push(...segment);
  }
  return allPoints.length >= 2 ? allPoints : DEFAULT_ROUTE_COORDS;
}

/**
 * Get port status based on progress
 */
export function getPortStatus(index: number, totalPorts: number, progress: number): PortStatus {
  if (totalPorts <= 1) return 'visited';
  const totalLegs = totalPorts - 1;
  const currentT = progress * totalLegs;
  const diff = currentT - index;

  if (index === 0) {
    if (progress < 0.025) return 'docked';
    return 'visited';
  }
  if (index === totalPorts - 1) {
    if (progress >= 0.975) return 'docked';
    return 'upcoming';
  }
  if (Math.abs(diff) <= 0.07) {
    return 'docked';
  } else if (currentT > index + 0.07) {
    return 'visited';
  } else {
    return 'upcoming';
  }
}
