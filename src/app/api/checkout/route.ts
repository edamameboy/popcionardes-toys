import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { formData, items, total } = body;

    const supabase = await createClient();

    // 1. Simpan pesanan ke Supabase dengan status 'pending'
    const { data: newOrder, error: dbError } = await supabase
      .from("orders")
      .insert({
        total_amount: total,
        status: "pending",
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_address: formData.address,
      })
      .select()
      .single();

    if (dbError || !newOrder) {
      throw new Error("Gagal menyimpan pesanan ke database");
    }

    // 2. Siapkan Payload untuk Midtrans (Gunakan UUID dari Supabase sebagai order_id)
    const payload = {
      transaction_details: {
        order_id: newOrder.id, // UUID dari tabel orders
        gross_amount: total,
      },
      customer_details: {
        first_name: formData.name,
        phone: formData.phone,
        shipping_address: {
          address: formData.address,
        },
      },
      item_details: items.map((item: any) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name.substring(0, 50),
      })),
    };

    // 3. Encode Server Key ke Base64
    const secret = process.env.MIDTRANS_SERVER_KEY + ":";
    const encodedSecret = Buffer.from(secret).toString("base64");

    // 4. Tembak API Midtrans (Sandbox)
    const midtransResponse = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${encodedSecret}`,
      },
      body: JSON.stringify(payload),
    });

    const midtransData = await midtransResponse.json();

    if (!midtransResponse.ok) {
      throw new Error(midtransData.error_messages?.[0] || "Gagal membuat token Midtrans");
    }

    // 5. Kembalikan token ke Client
    return NextResponse.json({ token: midtransData.token });
    
  } catch (error: any) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}