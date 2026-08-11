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
  const [localSearch, setLocalSearch] = useState("");
  const mapRef = useRef<any>(null);

  // Parse existing coordinates
  const latNum = latitude ? parseFloat(latitude) : center[0];
  const lngNum = longitude ? parseFloat(longitude) : center[1];

  // Fungsi pencarian lokasi
  const executeSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + " Indonesia")}`, {
        headers: { "User-Agent": "Popcionardes/1.0" }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setCenter([newLat, newLng]);
        onChange(newLat.toString(), newLng.toString());
        if (mapRef.current) {
          mapRef.current.setView([newLat, newLng], 16); // Zoom lebih dekat
        }
      }
    } catch (error) {
      console.error("Gagal mencari lokasi:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Geocoding Otomatis jika alamat diisi/diubah
  useEffect(() => {
    if (addressToSearch && addressToSearch.length > 4) {
      const timeoutId = setTimeout(() => {
        executeSearch(addressToSearch);
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [addressToSearch]);

  const handleLocalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch) {
      executeSearch(localSearch);
    }
  };

  return (
    <div className="relative border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-0 mt-4 h-[400px] w-full bg-gray-100">
      
      {/* Kolom Pencarian Melayang ala Google Maps */}
      <div className="absolute top-4 left-4 z-[9999] w-3/4 max-w-xs">
        <form onSubmit={handleLocalSearch} className="flex bg-white shadow-md border-2 border-black rounded-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-400">
          <input 
            type="text" 
            placeholder="Cari Lokasi di Peta..." 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full px-4 py-3 text-sm font-bold focus:outline-none"
          />
          <button type="submit" className="px-4 bg-gray-100 hover:bg-yellow-300 text-black border-l-2 border-black transition-colors flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
        </form>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center font-black uppercase text-sm backdrop-blur-sm">
          Mencari Lokasi... 🌍
        </div>
      )}

      <MapContainer 
        center={[latNum, lngNum]} 
        zoom={14} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker lat={latNum} lng={lngNum} onChange={onChange} />
      </MapContainer>
      
      <div className="absolute bottom-4 left-4 z-[9999] bg-white p-2 border-2 border-black font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] pointer-events-none rounded-sm">
        📍 {latNum.toFixed(5)}, {lngNum.toFixed(5)}
      </div>
    </div>
  );
}
