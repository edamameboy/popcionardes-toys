import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js"; // <-- PENTING: Gunakan dari library asli

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { order_id, status_code, gross_amount, signature_key, transaction_status, transaction_id } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const hash = crypto.createHash("sha512");
    hash.update(`${order_id}${status_code}${gross_amount}${serverKey}`);
    const expectedSignature = hash.digest("hex");

    if (signature_key !== expectedSignature) {
      console.error("🚨 Webhook: Invalid Signature!");
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // <-- Kunci rahasia yang baru Anda tambahkan
    );

    console.log(`📦 Webhook Diterima! Order: ${order_id} | Status: ${transaction_status}`);

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      
      // A. Ambil data pesanan
      const { data: orderData } = await supabaseAdmin
        .from('orders')
        .select('user_id, total_amount, user_voucher_id, status, items_data')
        .eq('id', order_id)
        .single();

      if (orderData && orderData.status !== 'paid' && orderData.status !== 'shipped' && orderData.status !== 'completed') {
        
        // Update status pesanan
        await supabaseAdmin
          .from('orders')
          .update({ status: 'paid', midtrans_transaction_id: transaction_id })
          .eq('id', order_id);

        // B. Kurangi Stok Produk (Deduct Stock)
        if (orderData.items_data && Array.isArray(orderData.items_data)) {
          for (const item of orderData.items_data) {
            // Ambil stock terbaru lalu kurangi
            const { data: prod } = await supabaseAdmin.from('products').select('stock').eq('id', item.id).single();
            if (prod) {
              const newStock = Math.max(0, prod.stock - item.quantity);
              await supabaseAdmin.from('products').update({ stock: newStock }).eq('id', item.id);
            }
          }
        }

        if (orderData.user_id) {
          // C. Injeksi Poin Otomatis
          const earnedPoints = Math.floor(orderData.total_amount / 1000);
          const { data: profileData } = await supabaseAdmin.from('profiles').select('points').eq('id', orderData.user_id).single();
          const newTotalPoints = (profileData?.points || 0) + earnedPoints;
          
          await supabaseAdmin.from('profiles').update({ points: newTotalPoints }).eq('id', orderData.user_id);
          console.log(`🎁 SUKSES! User ${orderData.user_id} mendapat ${earnedPoints} Poin.`);

          // D. JURUS PEMBAKAR VOUCHER
          if (orderData.user_voucher_id) {
            const { error: voucherError } = await supabaseAdmin
              .from('user_vouchers')
              .update({ is_used: true })
              .eq('id', orderData.user_voucher_id);
              
            if (voucherError) {
               console.error(`❌ Gagal membakar voucher:`, voucherError);
            } else {
               console.log(`🎟️ Voucher ID ${orderData.user_voucher_id} resmi dihanguskan!`);
            }
          }
        }
      }
        
    } else if (transaction_status === 'cancel' || transaction_status === 'expire' || transaction_status === 'deny') {
      await supabaseAdmin
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