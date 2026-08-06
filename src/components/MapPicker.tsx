"use client";

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Perbaiki bug ikon Leaflet di Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
  addressToSearch: string;
}

function LocationMarker({ lat, lng, onChange }: { lat: number, lng: number, onChange: any }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat.toString(), e.latlng.lng.toString());
    },
  });

  return (
    <Marker 
      position={[lat, lng]} 
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          onChange(position.lat.toString(), position.lng.toString());
        },
      }}
    />
  );
}

export default function MapPicker({ latitude, longitude, onChange, addressToSearch }: MapPickerProps) {
  const [center, setCenter] = useState<[number, number]>([-6.200000, 106.816666]); // Default Jakarta
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<any>(null);

  // Parse existing coordinates
  const latNum = latitude ? parseFloat(latitude) : center[0];
  const lngNum = longitude ? parseFloat(longitude) : center[1];

  // Geocoding Otomatis jika kordinat kosong tapi alamat diisi
  useEffect(() => {
    if (!latitude && !longitude && addressToSearch && addressToSearch.length > 4) {
      const searchLocation = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressToSearch + " Indonesia")}`, {
            headers: { "User-Agent": "Popcionardes/1.0" }
          });
          const data = await res.json();
          if (data && data.length > 0) {
            const newLat = parseFloat(data[0].lat);
            const newLng = parseFloat(data[0].lon);
            setCenter([newLat, newLng]);
            onChange(newLat.toString(), newLng.toString());
            if (mapRef.current) {
              mapRef.current.setView([newLat, newLng], 15);
            }
          }
        } catch (error) {
          console.error("Gagal mencari lokasi:", error);
        } finally {
          setIsLoading(false);
        }
      };

      // Debounce pencarian agar tidak memukul API terus menerus saat mengetik
      const timeoutId = setTimeout(() => {
        searchLocation();
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [addressToSearch, latitude, longitude]);

  return (
    <div className="relative border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-0 mt-4 h-72 w-full">
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 z-50 flex items-center justify-center font-black uppercase text-sm">
          Mencari Lokasi... 🌍
        </div>
      )}
      <MapContainer 
        center={[latNum, lngNum]} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker lat={latNum} lng={lngNum} onChange={onChange} />
      </MapContainer>
      <div className="absolute top-2 right-2 z-[9999] bg-yellow-300 p-2 border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] pointer-events-none">
        Geser/Klik Peta untuk memindah Pin
      </div>
      <div className="absolute bottom-2 left-2 z-[9999] bg-white p-2 border-2 border-black font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] pointer-events-none">
        📍 {latNum.toFixed(5)}, {lngNum.toFixed(5)}
      </div>
    </div>
  );
}
