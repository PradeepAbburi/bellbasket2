import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import { Store } from '@/types';

// Extend L for Routing if types are missing
const Routing = (L as any).Routing;

// Fix leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapViewProps {
  stores: Store[];
  center: [number, number];
  onStoreClick?: (storeId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  showRoute?: boolean;
  centerLabel?: string;
  onRouteFound?: (distance: number, time: number) => void;
  showSearch?: boolean;
}

const MapView = ({ stores, center, onStoreClick, onMapClick, showRoute = false, centerLabel, onRouteFound, showSearch }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routingControlRef = useRef<any>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  const centerKey = `${center[0]},${center[1]}`;
  const storesKey = stores.map(s => s.id).join(',');

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView(center, 14);

      const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      });

      const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      });

      streets.addTo(mapInstance.current);

      const baseMaps = {
        "Street": streets,
        "Satellite": satellite
      };

      L.control.layers(baseMaps).addTo(mapInstance.current);

      layersRef.current = L.layerGroup().addTo(mapInstance.current);

      if (onMapClick) {
        mapInstance.current.on('click', (e) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }
    } else {
      mapInstance.current.setView(center, mapInstance.current.getZoom());
    }

    // Clear existing routing
    if (routingControlRef.current && mapInstance.current) {
      try {
        mapInstance.current.removeControl(routingControlRef.current);
      } catch (e) {
        console.warn("Routing control cleanup skipped:", e);
      }
      routingControlRef.current = null;
    }

    // Clear existing markers
    if (layersRef.current) {
      layersRef.current.clearLayers();
    }

    if (showRoute && stores.length > 0) {
      const waypoints = [
        L.latLng(center[0], center[1]),
        ...stores.map(s => L.latLng(s.lat, s.lng))
      ];

      routingControlRef.current = Routing.control({
        router: Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1'
        }),
        waypoints: waypoints,
        lineOptions: {
          styles: [{ color: '#1e3a8a', opacity: 0.8, weight: 6 }]
        },
        createMarker: (i: number, waypoint: any) => {
          const isUser = i === 0;
          const storeIndex = i - 1;
          const store = stores[storeIndex];

          const html = isUser
            ? '<div style="width:16px;height:16px;background:#ef4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>'
            : `<div style="width:18px;height:18px;background:${i === waypoints.length - 1 ? '#059669' : '#1e3a8a'};border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;items-center;justify-center;color:white;font-size:10px;font-weight:900">${i}</div>`;

          return L.marker(waypoint.latLng, {
            icon: L.divIcon({
              html,
              className: '',
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            })
          }).bindPopup(isUser ? 'Starting Point' : `<strong>Stop ${i}: ${store?.name || 'Store'}</strong>`);
        },
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false // Hide the instruction list
      }).on('routesfound', (e: any) => {
        const routes = e.routes;
        if (routes && routes[0] && onRouteFound) {
          const summary = routes[0].summary;
          onRouteFound(summary.totalDistance, summary.totalTime);
        }
      }).addTo(mapInstance.current);
    } else {
      // Just markers if no routing
      stores.forEach(store => {
        const storeIcon = L.divIcon({
          html: `<div style="width:12px;height:12px;background:#1e3a8a;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2)"></div>`,
          className: '',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker([store.lat, store.lng], { icon: storeIcon })
          .addTo(layersRef.current!)
          .bindPopup(`<strong>${store.name}</strong>`);
      });

      const userIcon = L.divIcon({
        html: '<div style="width:16px;height:16px;background:#ef4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const centerMarker = L.marker(center, { icon: userIcon }).addTo(layersRef.current!);

      if (centerLabel) {
        centerMarker.bindPopup(`<strong>${centerLabel}</strong>`).openPopup();
      } else {
        centerMarker.bindPopup('You are here');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storesKey, centerKey, showRoute, centerLabel]);

  useEffect(() => {
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full rounded-2xl" style={{ height: '100%' }} />;
};

export default MapView;
