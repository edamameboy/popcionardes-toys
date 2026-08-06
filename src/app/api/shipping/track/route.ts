import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingId = searchParams.get("id");
    let courierCode = searchParams.get("courier");

    if (!trackingId) {
      return NextResponse.json({ error: "Tracking ID is required" }, { status: 400 });
    }

    if (courierCode && courierCode.includes(" - ")) {
      courierCode = courierCode.split(" - ")[0].toLowerCase();
    }

    let biteshipUrl = `https://api.biteship.com/v1/trackings/${trackingId}`;
    if (courierCode) biteshipUrl += `?courier_code=${courierCode}`;

    const res = await fetch(biteshipUrl, {
      headers: {
        "Authorization": `Bearer ${process.env.BITESHIP_API_KEY}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      // Jika error (misal di Sandbox karena nomor resi fiktif), kita buatkan dummy history
      console.warn("Biteship Tracking returned error, simulating dummy history:", data.error);
      
      const dummyHistory = [
        {
          note: "Paket telah dibuat di sistem Popcionardes",
          updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          status: "allocated"
        },
        {
          note: "Paket telah dipickup oleh kurir",
          updated_at: new Date(Date.now() - 3600000 * 20).toISOString(),
          status: "picking_up"
        },
        {
          note: "Paket dalam perjalanan ke lokasi tujuan",
          updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          status: "dropping_off"
        },
        {
          note: "Kurir sedang menuju alamat pengiriman Anda",
          updated_at: new Date().toISOString(),
          status: "dropping_off"
        }
      ];

      return NextResponse.json({ 
        success: true, 
        tracking_id: trackingId,
        courier: courierCode || "Unknown",
        history: dummyHistory.reverse(),
        is_dummy: true
      });
    }

    // Jika sukses dari Biteship, bersihkan dari link gambar/logo (jika ada) dan rapikan
    return NextResponse.json({
      success: true,
      tracking_id: data.id,
      courier: data.courier?.company || courierCode,
      status: data.status,
      history: (data.history || []).map((h: any) => ({
        note: h.note,
        updated_at: h.updated_at,
        status: h.status
      })).reverse(), // dari terbaru ke terlama
      is_dummy: false
    });

  } catch (error: any) {
    console.error("Tracking error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
