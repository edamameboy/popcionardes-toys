import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { formData, items, courier, userId, userVoucherId, shippingCost: frontendShippingCost } = body; 

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Keranjang kosong" }, { status: 400 });
    }

    const supabase = await createClient();

    // BACKEND API PROTECTION (Layer 2)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Harap login terlebih dahulu." }, { status: 401 });
    }

    // 1. Ambil data Products, Voucher, dan Ongkir secara paralel (OPTIMASI)
    const productIds = items.map((item: any) => item.id);
    
    const [productsRes, voucherRes, shippingRes] = await Promise.all([
      supabase.from("products").select("id, name, price, stock").in("id", productIds),
      userVoucherId ? supabase.from("user_vouchers").select("*, voucher:vouchers(*)").eq("id", userVoucherId).single() : Promise.resolve({ data: null }),
      supabase.from("shipping_cache").select("*").eq("postal_code", formData.postalCode).single()
    ]);

    const productsDb = productsRes.data || [];
    const uv = voucherRes.data;
    const shippingCache = shippingRes.data;

    // 2. Validasi & Hitung Harga Barang
    let trueSubtotal = 0;
    const validatedItems = items.map((clientItem: any) => {
      const dbProduct = productsDb.find((p: any) => p.id === clientItem.id);
      if (!dbProduct) throw new Error(`Produk tidak ditemukan: ${clientItem.name}`);
      
      const truePrice = dbProduct.price;
      const qty = clientItem.quantity || 1;

      if (dbProduct.stock < qty) {
        throw new Error(`Stok tidak cukup untuk produk: ${clientItem.name}. Sisa stok: ${dbProduct.stock}`);
      }

      trueSubtotal += (truePrice * qty);
      
      return {
        id: String(dbProduct.id).substring(0, 50),
        price: Math.round(truePrice),
        quantity: qty,
        name: String(dbProduct.name).substring(0, 50)
      };
    });

    // 3. Validasi & Hitung Diskon
    let trueDiscount = 0;
    if (uv && uv.user_id === userId && !uv.is_used && uv.voucher?.is_active) {
      const v = uv.voucher;
      if (v.type === 'PERCENTAGE') {
        if (trueSubtotal >= (v.min_purchase || 0)) {
          trueDiscount = trueSubtotal * (v.discount_value / 100);
          if (v.max_discount > 0 && trueDiscount > v.max_discount) trueDiscount = v.max_discount;
        }
      } else if (v.type === 'BUY_X_GET_Y') {
        const buyX = v.details?.min_qty_required || 1;
        const getY = v.details?.free_qty_given || 1;
        const groupSize = buyX + getY; 
        const totalItemsInCart = validatedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

        if (totalItemsInCart >= groupSize) {
          let allPrices: number[] = [];
          validatedItems.forEach((item: any) => {
            for (let i = 0; i < item.quantity; i++) allPrices.push(item.price);
          });
          allPrices.sort((a, b) => a - b);
          const timesPromoApplied = Math.floor(totalItemsInCart / groupSize);
          const totalFreeItems = timesPromoApplied * getY;
          for (let i = 0; i < totalFreeItems; i++) {
            if (allPrices[i]) trueDiscount += allPrices[i];
          }
        }
      } else if (v.type === 'FIXED' || v.discount_amount > 0) {
        if (trueSubtotal >= (v.min_purchase || 0)) {
          trueDiscount = v.discount_value || v.discount_amount;
        }
      }
    }

    // 4. Validasi Ongkos Kirim dari Cache
    let trueShippingCost = frontendShippingCost; // Fallback
    if (shippingCache && shippingCache.rates_data) {
      const matchedRate = shippingCache.rates_data.find(
        (c: any) => courier === `${c.company} - ${c.type}` && c.price === frontendShippingCost
      );
      if (matchedRate) {
        trueShippingCost = matchedRate.price;
      } else {
        // Jika dimanipulasi, paksa pakai harga pertama yang cocok dengan kurir
        const anyRate = shippingCache.rates_data.find((c: any) => courier === `${c.company} - ${c.type}`);
        if (anyRate) {
          trueShippingCost = anyRate.price;
        } else {
            // Jika kurir pun dimanipulasi dan tidak ada di cache
            throw new Error(`Kurir ${courier} tidak valid untuk kodepos ini.`);
        }
      }
    }

    // 5. Hitung Net Total
    const netTotal = Math.max(0, trueSubtotal + trueShippingCost - trueDiscount);

    // 6. Simpan ke Database
    const { data: newOrder, error: dbError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        user_voucher_id: (uv && trueDiscount > 0) ? userVoucherId : null, 
        total_amount: netTotal,
        status: "pending",
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_address: formData.address,
        shipping_cost: trueShippingCost,
        courier_name: courier,
        items_data: JSON.parse(JSON.stringify(validatedItems)) 
      } as any)
      .select()
      .single();

    if (dbError) throw dbError;

    // 7. Midtrans Payload
    const authString = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64");

    const midtransItems = [...validatedItems];

    midtransItems.push({
      id: "SHIPPING",
      price: Math.round(trueShippingCost),
      quantity: 1,
      name: `Ongkir: ${courier}`.substring(0, 50),
    });

    if (trueDiscount > 0) {
      midtransItems.push({
        id: "VOUCHER-DISCOUNT",
        price: -Math.round(trueDiscount), 
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