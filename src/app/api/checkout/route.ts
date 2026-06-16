import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Tangkap parameter dari frontend (termasuk list "items")
    const { formData, items, total, courier, shippingCost, userId, userVoucherId, discountAmount } = body; 

    const supabase = await createClient();

    // 2. Hitung Total Bersih (Subtotal + Ongkir - Diskon)
    const netTotal = Math.max(0, total + shippingCost - (discountAmount || 0));

    // ==========================================
    // 3. JURUS RAHASIA: SIMPAN ITEMS KE SUPABASE
    // ==========================================
    const { data: newOrder, error: dbError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        user_voucher_id: userVoucherId || null,
        total_amount: netTotal,
        status: "pending",
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_address: formData.address,
        shipping_cost: shippingCost,
        courier_name: courier,
        
        // Pastikan kita memaksa formatnya menjadi murni JSON
        items_data: JSON.parse(JSON.stringify(items)) 
      } as any) // <--- TAMBAHKAN 'as any' DI SINI UNTUK MEMBYPASS SENSOR TYPESCRIPT
      .select()
      .single();

    if (dbError) throw dbError;

    // 4. Siapkan Data untuk Midtrans
    const authString = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64");

    const midtransItems = items.map((item: any) => ({
      id: String(item.id).substring(0, 50),
      price: Math.round(item.price),
      quantity: item.quantity,
      name: String(item.name).substring(0, 50),
    }));

    midtransItems.push({
      id: "SHIPPING",
      price: Math.round(shippingCost),
      quantity: 1,
      name: `Ongkir: ${courier}`.substring(0, 50),
    });

    if (discountAmount > 0) {
      midtransItems.push({
        id: "VOUCHER-DISCOUNT",
        price: -Math.round(discountAmount), 
        quantity: 1,
        name: "Diskon Kupon Sultan",
      });
    }

    const payload = {
      transaction_details: {
        order_id: newOrder.id,
        gross_amount: Math.round(netTotal),
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

    const MIDTRANS_URL = process.env.NEXT_PUBLIC_MIDTRANS_API_URL || "https://app.sandbox.midtrans.com";
    const midtransResponse = await fetch(`${MIDTRANS_URL}/snap/v1/transactions`, {
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