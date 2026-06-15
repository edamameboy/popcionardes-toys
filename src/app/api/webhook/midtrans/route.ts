// src/app/api/webhook/midtrans/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Data yang dikirim oleh Midtrans
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      transaction_id
    } = body;

    // 1. Verifikasi Keamanan (Signature Key)
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const hash = crypto.createHash("sha512");
    
    // Rumus verifikasi dari dokumentasi Midtrans
    hash.update(`${order_id}${status_code}${gross_amount}${serverKey}`);
    const expectedSignature = hash.digest("hex");

    if (signature_key !== expectedSignature) {
      console.error("🚨 Webhook: Invalid Signature!");
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    // 2. Inisialisasi Supabase
    const supabase = await createClient();

    console.log(`📦 Webhook Diterima! Order: ${order_id} | Status: ${transaction_status}`);

    // 3. Update Database berdasarkan status transaksi
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      // Pembayaran BERHASIL
      await supabase
        .from('orders')
        .update({ 
          status: 'paid',
          midtrans_transaction_id: transaction_id 
        })
        .eq('id', order_id);
        
    } else if (transaction_status === 'cancel' || transaction_status === 'expire' || transaction_status === 'deny') {
      // Pembayaran GAGAL / KADALUARSA
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order_id);
    }

    // Wajib merespon 200 OK ke Midtrans agar mereka tidak melakukan pengiriman ulang (retries)
    return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });

  } catch (error) {
    console.error("🔥 Webhook Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}