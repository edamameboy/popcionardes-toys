import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Waktu kadaluarsa cache (24 Jam dalam milidetik)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; 

export async function POST(request: Request) {
  try {
    const { destinationPostalCode } = await request.json();

    if (!destinationPostalCode || destinationPostalCode.length !== 5) {
      return NextResponse.json({ error: "Kode pos tidak valid" }, { status: 400 });
    }

    const supabase = await createClient();

    // ==========================================
    // 1. CEK CACHE DI SUPABASE DULU (GRATIS!)
    // ==========================================
    const { data: cachedData, error: cacheError } = await supabase
      .from('shipping_cache')
      .select('*')
      .eq('postal_code', destinationPostalCode)
      .single();

    if (cachedData) {
      const now = new Date().getTime();
      const lastUpdated = new Date(cachedData.last_updated).getTime();

      // Jika umur cache masih di bawah 24 jam, langsung pakai data ini!
      if (now - lastUpdated < CACHE_EXPIRATION) {
        console.log(`⚡ CACHE HIT: Menggunakan ongkir tersimpan untuk kodepos ${destinationPostalCode}`);
        return NextResponse.json({ rates: cachedData.rates_data });
      } else {
        console.log(`🔄 CACHE EXPIRED: Memperbarui ongkir untuk kodepos ${destinationPostalCode}`);
      }
    }

    // ==========================================
    // 2. JIKA CACHE KOSONG/USANG, FETCH KE BITESHIP (BAYAR)
    // ==========================================
    console.log(`🚀 FETCH API: Menembak Biteship untuk kodepos ${destinationPostalCode}`);
    
    const payload = {
      origin_postal_code: 12190, // Ganti dengan Kode Pos Toko Anda
      destination_postal_code: parseInt(destinationPostalCode),
      couriers: "jne,sicepat,jnt", 
      items: [
        {
          name: "Mainan Popcionardes",
          description: "Pesanan Mainan",
          value: 100000,
          length: 10, width: 10, height: 10, weight: 1000, 
        }
      ]
    };

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
          { company: "JNE", type: "REG", duration: "2-3 Hari", price: 15000 },
          { company: "SiCepat", type: "HALU", duration: "3-5 Hari", price: 12000 },
          { company: "J&T", type: "EZ", duration: "1-2 Hari", price: 18000 },
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
    await supabase.from('shipping_cache').upsert({
      postal_code: destinationPostalCode,
      rates_data: finalRates,
      last_updated: new Date().toISOString()
    });

    return NextResponse.json({ rates: finalRates });
    
  } catch (error: any) {
    console.error("Biteship Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}