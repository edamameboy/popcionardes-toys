import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const { order_id } = await request.json();
    if (!order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    // BACKEND API PROTECTION
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const encodedKey = Buffer.from(serverKey + ":").toString('base64');

    const midtransRes = await fetch(`https://api.sandbox.midtrans.com/v2/${order_id}/status`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedKey}`
      }
    });

    const midtransData = await midtransRes.json();

    // 404 means the transaction is not found in midtrans
    if (midtransData.status_code === "404") {
      return NextResponse.json({ message: "Transaction not found in Midtrans", status: "pending" }, { status: 200 });
    }

    const transaction_status = midtransData.transaction_status;
    const transaction_id = midtransData.transaction_id;

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ambil order saat ini
    const { data: currentOrder } = await supabaseAdmin.from("orders").select("status").eq("id", order_id).single();
    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Jika di database kita sudah paid, tidak perlu update lagi
    if (currentOrder.status === 'paid' || currentOrder.status === 'shipped') {
      return NextResponse.json({ message: "Already synced", status: currentOrder.status }, { status: 200 });
    }

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      // Update status pesanan
      await supabaseAdmin
        .from('orders')
        .update({ status: 'paid', midtrans_transaction_id: transaction_id })
        .eq('id', order_id);

      // A. Ambil data pesanan
      const { data: orderData } = await supabaseAdmin
        .from('orders')
        .select('user_id, total_amount, user_voucher_id')
        .eq('id', order_id)
        .single();

      if (orderData && orderData.user_id) {
        // B. Injeksi Poin Otomatis
        const earnedPoints = Math.floor(orderData.total_amount / 1000);
        const { data: profileData } = await supabaseAdmin.from('profiles').select('points').eq('id', orderData.user_id).single();
        const newTotalPoints = (profileData?.points || 0) + earnedPoints;
        
        await supabaseAdmin.from('profiles').update({ points: newTotalPoints }).eq('id', orderData.user_id);

        // C. Bakar voucher
        if (orderData.user_voucher_id) {
          await supabaseAdmin
            .from('user_vouchers')
            .update({ is_used: true })
            .eq('id', orderData.user_voucher_id);
        }
      }
      return NextResponse.json({ message: "Synced successfully", status: "paid" }, { status: 200 });
    } else if (transaction_status === 'cancel' || transaction_status === 'expire' || transaction_status === 'deny') {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order_id);
      return NextResponse.json({ message: "Synced successfully", status: "cancelled" }, { status: 200 });
    }

    return NextResponse.json({ message: "No changes", status: currentOrder.status }, { status: 200 });

  } catch (error) {
    console.error("Sync Order Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
