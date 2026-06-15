import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Kita tambahkan penangkapan variabel courier dan shippingCost
    const { formData, items, total, courier, shippingCost, userId, } = body; 

    const supabase = await createClient();

    // 1. Simpan pesanan ke Supabase (Sekarang dengan ongkir)
    const { data: newOrder, error: dbError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        total_amount: total + shippingCost, // Total barang + ongkir
        status: "pending",
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_address: formData.address,
        shipping_cost: shippingCost,
        courier_name: courier,
      })
      .select()
      .single();

    if (dbError || !newOrder) {
      throw new Error("Gagal menyimpan pesanan ke database");
    }

    // 2. Format daftar barang untuk Midtrans
    const itemDetails = items.map((item: any) => ({
      id: item.id,
      price: item.price,
      quantity: item.quantity,
      name: item.name.substring(0, 50),
    }));

    // 3. TAMBAHKAN ONGKIR SEBAGAI ITEM (Wajib agar Midtrans tidak error selisih harga)
    if (shippingCost > 0) {
      itemDetails.push({
        id: "SHIPPING",
        price: shippingCost,
        quantity: 1,
        name: `Ongkir - ${courier}`,
      });
    }

    // 4. Siapkan Payload Midtrans
    const payload = {
      transaction_details: {
        order_id: newOrder.id,
        gross_amount: total + shippingCost, // Harus sama dengan total itemDetails
      },
      customer_details: {
        first_name: formData.name,
        phone: formData.phone,
        shipping_address: { address: formData.address },
      },
      item_details: itemDetails,
    };

    const secret = process.env.MIDTRANS_SERVER_KEY + ":";
    const encodedSecret = Buffer.from(secret).toString("base64");

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

    return NextResponse.json({ token: midtransData.token });
    
  } catch (error: any) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}