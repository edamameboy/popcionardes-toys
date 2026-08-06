import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Waktu kadaluarsa cache (24 Jam dalam milidetik)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; 

export async function POST(request: Request) {
  try {
    const { destinationPostalCode, latitude, longitude } = await request.json();

    if (!destinationPostalCode) {
      return NextResponse.json({ error: "Kodepos tujuan wajib diisi!" }, { status: 400 });
    }

    const supabase = await createClient();

    // BACKEND API PROTECTION (Layer 2)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Harap login terlebih dahulu." }, { status: 401 });
    }

    // ==========================================
    // 1. CEK CACHE DI SUPABASE DULU (GRATIS!)
    // ==========================================
    const { data: cachedData } = await supabase
      .from('shipping_cache')
      .select('*')
      .eq('postal_code', destinationPostalCode)
      .single();

    if (cachedData) {
      const now = new Date().getTime();
      const lastUpdated = new Date(cachedData.last_updated).getTime();
      
      // Validasi format baru
      const hasDurationRange = cachedData.rates_data && cachedData.rates_data.length > 0 && cachedData.rates_data[0].shipment_duration_range !== undefined;
      
      const meta = cachedData.rates_data.find((c: any) => c.company === '__meta__');
      const cacheUsedCoords = meta ? meta.coords_used : false;
      const requestHasCoords = !!(latitude && longitude);

      // Bypass cache jika request punya kordinat, TAPI cache lama dibuat tanpa kordinat
      const isNewFormat = hasDurationRange && (!requestHasCoords || cacheUsedCoords);

      // Filter out meta object before returning to client
      const ratesToReturn = cachedData.rates_data.filter((c: any) => c.company !== '__meta__');

      // Jika umur cache masih di bawah 24 jam dan formatnya baru, pakai!
      if (now - lastUpdated < CACHE_EXPIRATION && isNewFormat) {
        console.log(`⚡ CACHE HIT: Menggunakan ongkir tersimpan untuk kodepos ${destinationPostalCode}`);
        return NextResponse.json({ rates: ratesToReturn });
      } else {
        console.log(`🔄 CACHE EXPIRED atau USANG: Memperbarui ongkir untuk kodepos ${destinationPostalCode}`);
      }
    }

    // ==========================================
    // 2. JIKA CACHE KOSONG/USANG, FETCH KE BITESHIP (BAYAR)
    // ==========================================
    console.log(`🚀 FETCH API: Menembak Biteship untuk kodepos ${destinationPostalCode}`);

    // Dapatkan kurir yang aktif di dashboard Biteship
    const couriersRes = await fetch("https://api.biteship.com/v1/couriers", {
      method: "GET",
      headers: { "Authorization": `Bearer ${process.env.BITESHIP_API_KEY}` }
    });
    let activeCouriersString = "jne,sicepat,jnt"; // fallback
    if (couriersRes.ok) {
      const couriersData = await couriersRes.json();
      if (couriersData.couriers && couriersData.couriers.length > 0) {
        // Ambil unique courier_code
        const codes = Array.from(new Set(couriersData.couriers.map((c: any) => c.courier_code)));
        activeCouriersString = codes.join(",");
      }
    }
    
    const payload: any = {
      origin_postal_code: 12190, // Ganti dengan Kode Pos Toko Anda
      origin_latitude: -6.225014,
      origin_longitude: 106.842777,
      destination_postal_code: parseInt(destinationPostalCode),
      couriers: activeCouriersString, 
      items: [
        {
          name: "Mainan Popcionardes",
          description: "Pesanan Mainan",
          value: 100000,
          length: 10, width: 10, height: 10, weight: 1000, 
        }
      ]
    };

    if (latitude && longitude) {
      payload.destination_latitude = parseFloat(latitude);
      payload.destination_longitude = parseFloat(longitude);
    }

    const response = await fetch("https://api.biteship.com/v1/rates/couriers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.BITESHIP_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    let finalRates = [];

    if (!response.ok) {
      // Fallback mechanism (Jika saldo habis / error)
      if (data.error && data.error.toLowerCase().includes("balance")) {
        console.warn("⚠️ Saldo Biteship kosong. Beralih ke Data Simulasi.");
        finalRates = [
          { company: "jne", type: "reg", duration: "2 - 3 days", shipment_duration_range: "2 - 3", shipment_duration_unit: "days", price: 15000 },
          { company: "sicepat", type: "halu", duration: "3 - 5 days", shipment_duration_range: "3 - 5", shipment_duration_unit: "days", price: 12000 },
          { company: "jnt", type: "ez", duration: "1 - 2 days", shipment_duration_range: "1 - 2", shipment_duration_unit: "days", price: 18000 },
          { company: "grab", type: "instant", duration: "1 - 3 hours", shipment_duration_range: "1 - 3", shipment_duration_unit: "hours", price: 25000 },
          { company: "gojek", type: "same_day", duration: "4 - 8 hours", shipment_duration_range: "4 - 8", shipment_duration_unit: "hours", price: 20000 },
        ];
      } else {
        throw new Error(data.error || "Gagal mengambil ongkir dari Biteship");
      }
    } else {
      // Jika berhasil, gunakan data pricing asli
      finalRates = data.pricing;
    }

    // ==========================================
    // 3. SIMPAN HASILNYA KE SUPABASE CACHE
    // ==========================================
    const ratesForCache = [...finalRates];
    ratesForCache.push({ company: "__meta__", coords_used: !!(latitude && longitude) });

    await supabase.from('shipping_cache').upsert({
      postal_code: destinationPostalCode,
      rates_data: ratesForCache,
      last_updated: new Date().toISOString()
    });

    return NextResponse.json({ rates: finalRates });
    
  } catch (error: any) {
    console.error("Biteship Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}