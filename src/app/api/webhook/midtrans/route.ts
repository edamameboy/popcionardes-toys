import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      transaction_id
    } = body;

    // 1. Verifikasi Keamanan Signature Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const hash = crypto.createHash("sha512");
    hash.update(`${order_id}${status_code}${gross_amount}${serverKey}`);
    const expectedSignature = hash.digest("hex");

    if (signature_key !== expectedSignature) {
      console.error("🚨 Webhook: Invalid Signature!");
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const supabase = await createClient();
    console.log(`📦 Webhook Diterima! Order: ${order_id} | Status: ${transaction_status}`);

    // 2. LOGIKA UPDATE DATABASE & INJEKSI POIN
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      
      // A. Update status pesanan jadi LUNAS (paid)
      await supabase
        .from('orders')
        .update({ 
          status: 'paid',
          midtrans_transaction_id: transaction_id 
        })
        .eq('id', order_id);

      // B. Ambil data pesanan untuk menghitung poin
      const { data: orderData } = await supabase
        .from('orders')
        .select('user_id, total_amount')
        .eq('id', order_id)
        .single();

      // C. Tambahkan poin ke profil user (Rp 1.000 = 1 Poin)
      if (orderData && orderData.user_id) {
        const earnedPoints = Math.floor(orderData.total_amount / 1000);

        // Ambil poin saat ini
        const { data: profileData } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', orderData.user_id)
          .single();

        const currentPoints = profileData?.points || 0;
        const newTotalPoints = currentPoints + earnedPoints;

        // Tembakkan poin baru ke database
        await supabase
          .from('profiles')
          .update({ points: newTotalPoints })
          .eq('id', orderData.user_id);
          
        console.log(`🎁 SUKSES! User ${orderData.user_id} mendapat ${earnedPoints} Poin. Total Poin: ${newTotalPoints}`);
      }
        
    } else if (transaction_status === 'cancel' || transaction_status === 'expire' || transaction_status === 'deny') {
      // Pembayaran GAGAL / KADALUARSA
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order_id);
    }

    return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });

  } catch (error) {
    console.error("🔥 Webhook Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}