import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Tangkap parameter voucher dari frontend
    const { formData, items, total, courier, shippingCost, userId, userVoucherId, discountAmount } = body; 

    const supabase = await createClient();

    // 2. Hitung Total Bersih (Subtotal + Ongkir - Diskon)
    // Gunakan Math.max agar total tidak pernah minus (jika diskon lebih besar dari total belanja)
    const netTotal = Math.max(0, total + shippingCost - (discountAmount || 0));

    // 3. Masukkan data ke tabel orders, termasuk user_voucher_id
    const { data: newOrder, error: dbError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        user_voucher_id: userVoucherId || null, // <-- Menyimpan jejak voucher
        total_amount: netTotal,
        status: "pending",
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_address: formData.address,
        shipping_cost: shippingCost,
        courier_name: courier,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 4. Siapkan Data untuk Midtrans
    const authString = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64");

    const midtransItems = items.map((item: any) => ({
      id: item.id,
      price: item.price,
      quantity: item.quantity,
      name: item.name.substring(0, 50),
    }));

    midtransItems.push({
      id: "SHIPPING",
      price: shippingCost,
      quantity: 1,
      name: `Ongkir: ${courier}`.substring(0, 50),
    });

    // 5. Trik Midtrans: Tambahkan item khusus untuk Diskon (Harganya Minus!)
    if (discountAmount > 0) {
      midtransItems.push({
        id: "VOUCHER-DISCOUNT",
        price: -discountAmount, 
        quantity: 1,
        name: "Diskon Kupon Sultan",
      });
    }

    const payload = {
      transaction_details: {
        order_id: newOrder.id,
        gross_amount: netTotal,
      },
      item_details: midtransItems,
      customer_details: {
        first_name: formData.name,
        phone: formData.phone,
        shipping_address: {
          first_name: formData.name,
          phone: formData.phone,
          address: formData.address,
          postal_code: formData.postalCode,
        },
      },
    };

    const midtransResponse = await fetch(`${process.env.NEXT_PUBLIC_MIDTRANS_API_URL}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    });

    const midtransData = await midtransResponse.json();
    if (!midtransResponse.ok) throw new Error(midtransData.error_messages?.[0] || "Gagal membuat transaksi Midtrans");

    return NextResponse.json({ token: midtransData.token });

  } catch (error: any) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}