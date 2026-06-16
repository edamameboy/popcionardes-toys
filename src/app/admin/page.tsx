"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // State Navigasi
  const [activeTab, setActiveTab] = useState("orders");

  // State Pesanan
  const [orders, setOrders] = useState<any[]>([]);
  const [trackingInputs, setTrackingInputs] = useState<{ [key: string]: string }>({});
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // State Produk (Gudang)
  const [products, setProducts] = useState<any[]>([]);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  // Form Produk
  const initialProductForm = { name: "", description: "", price: "", stock: "", bg_color: "bg-white", image_url: "" };
  const [productForm, setProductForm] = useState<any>(initialProductForm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!profile || profile.role !== "admin") {
        alert("🚨 Akses Ditolak: Anda bukan Admin!");
        return router.push("/");
      }
      setIsAdmin(true);

      // Tarik Data Pesanan
      const { data: allOrders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(allOrders || []);

      // Tarik Data Produk
      const { data: allProducts } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      setProducts(allProducts || []);

    } catch (error: any) {
      alert(`Gagal memuat dashboard: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // FUNGSI TAB 1: UPDATE PESANAN
  // ==========================================
  const handleUpdateTracking = async (orderId: string, currentStatus: string) => {
    const resi = trackingInputs[orderId];
    if (!resi && currentStatus === "paid") return alert("Masukkan nomor resi kurir terlebih dahulu bos!");

    setIsUpdating(orderId);
    try {
      const nextStatus = currentStatus === "paid" ? "shipped" : currentStatus;
      const updateData: any = { status: nextStatus };
      if (resi) updateData.biteship_tracking_id = resi;

      const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
      if (error) throw error;

      alert("🚀 Pesanan Berhasil Di-update!");
      fetchAdminData(); 
    } catch (error: any) { alert(`Gagal update: ${error.message}`); } finally { setIsUpdating(null); }
  };

  // ==========================================
  // FUNGSI TAB 2: CRUD PRODUK
  // ==========================================
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProduct(true);
    try {
      let finalImageUrl = productForm.image_url;

      // 1. Upload Gambar Jika Ada
      if (uploadFile) {
        const fileExt = uploadFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("products").upload(fileName, uploadFile);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(fileName);
        finalImageUrl = publicUrl;
      }

      const payload = {
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        quantity: Number(productForm.stock), // Sinkronisasi dengan kolom keranjang
        bg_color: productForm.bg_color,
        image_url: finalImageUrl || "https://api.dicebear.com/7.x/shapes/svg?seed=box" // Fallback
      };

      // 2. Simpan ke Database (Update atau Insert)
      if (editingProductId) {
        await supabase.from("products").update(payload).eq("id", editingProductId);
        alert("✅ Produk berhasil di-update!");
      } else {
        await supabase.from("products").insert(payload);
        alert("🎉 Produk baru berhasil mendarat di toko!");
      }

      // Reset Form & Refresh
      setProductForm(initialProductForm);
      setUploadFile(null);
      setEditingProductId(null);
      fetchAdminData();
    } catch (error: any) { alert(`Error menyimpan produk: ${error.message}`); } finally { setIsSubmittingProduct(false); }
  };

  const handleEditProduct = (prod: any) => {
    setEditingProductId(prod.id);
    setProductForm({ name: prod.name, description: prod.description, price: prod.price, stock: prod.stock, bg_color: prod.bg_color, image_url: prod.image_url });
    setUploadFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll ke atas
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Yakin mau menghapus mainan "${name}"? Data yang hilang tak akan kembali!`)) return;
    try {
      await supabase.from("products").delete().eq("id", id);
      alert("🗑️ Produk hangus terhapus!");
      fetchAdminData();
    } catch (error: any) { alert(`Gagal menghapus: ${error.message}`); }
  };


  if (!mounted || isLoading) return <div className="min-h-screen flex justify-center items-center font-black text-2xl uppercase">Membuka Brankas Toko... 🔐</div>;
  if (!isAdmin) return null;

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-black pb-6 gap-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Ruang Kendali Admin</h1>
        </div>
        <div className="bg-red-400 border-4 border-black px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white">
          ⚡ MODE CONTROL: ACTIVE
        </div>
      </div>

      {/* SISTEM TABS */}
      <div className="flex gap-4 border-b-4 border-black pb-4 overflow-x-auto whitespace-nowrap">
        <button onClick={() => setActiveTab("orders")} className={`px-6 py-3 font-black uppercase border-4 border-black transition-all ${activeTab === "orders" ? "bg-black text-white shadow-none translate-x-1 translate-y-1" : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100"}`}>Arus Pesanan</button>
        <button onClick={() => setActiveTab("products")} className={`px-6 py-3 font-black uppercase border-4 border-black transition-all ${activeTab === "products" ? "bg-black text-white shadow-none translate-x-1 translate-y-1" : "bg-pink-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-400"}`}>Gudang Mainan</button>
      </div>

      {/* ========================================== */}
      {/* KONTEN TAB 1: ARUS PESANAN */}
      {/* ========================================== */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-300 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-bold text-xs uppercase opacity-70">Total Pesanan</p><p className="text-3xl font-black">{orders.length}</p>
            </div>
            <div className="bg-green-400 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-bold text-xs uppercase opacity-70">Lunas / Dikirim</p><p className="text-3xl font-black">{orders.filter(o => o.status === 'paid' || o.status === 'shipped').length}</p>
            </div>
            <div className="bg-yellow-300 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-bold text-xs uppercase opacity-70">Omset Penjualan</p><p className="text-3xl font-black">{formatRupiah(orders.filter(o => o.status === 'paid' || o.status === 'shipped').reduce((sum, o) => sum + Number(o.total_amount), 0))}</p>
            </div>
          </div>

          {orders.map((order) => (
             <div key={order.id} className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col lg:flex-row gap-6 justify-between">
             <div className="space-y-2 flex-1">
               <div className="flex items-center gap-2 flex-wrap">
                 <span className="text-xs font-black bg-gray-200 border-2 border-black px-2 py-0.5">#{order.id.substring(0,8).toUpperCase()}</span>
                 <span className={`text-xs font-black px-2 py-0.5 border-2 border-black ${order.status === 'paid' && 'bg-green-400'} ${order.status === 'shipped' && 'bg-blue-400 text-white'} ${order.status === 'pending' && 'bg-amber-300'} ${order.status === 'cancelled' && 'bg-red-400 text-white'}`}>STATUS: {order.status.toUpperCase()}</span>
               </div>
               <p className="font-black text-xl uppercase leading-tight">{order.customer_name} ({order.customer_phone})</p>
               <p className="text-sm font-bold opacity-80 max-w-xl">📍 {order.customer_address}</p>
             </div>

             <div className="flex flex-col sm:flex-row lg:flex-col justify-between lg:justify-center items-start sm:items-center lg:items-end gap-4 bg-gray-50 p-4 border-2 border-black lg:min-w-62.5">
               <div><p className="text-[10px] font-black uppercase opacity-60">Ongkir: {formatRupiah(order.shipping_cost)}</p><p className="font-black text-xl bg-yellow-200 px-2 border-2 border-black inline-block">{formatRupiah(order.total_amount)}</p></div>
             </div>

             <div className="flex flex-col justify-center gap-2 lg:w-1/4 border-t-2 lg:border-t-0 lg:border-l-2 border-dashed border-black pt-4 lg:pt-0 lg:pl-6">
               {order.status === "paid" ? (
                 <><input type="text" placeholder="Resi Kirim" value={trackingInputs[order.id] || ""} onChange={(e) => setTrackingInputs({ ...trackingInputs, [order.id]: e.target.value })} className="p-2 border-2 border-black font-bold text-sm" /><button onClick={() => handleUpdateTracking(order.id, "paid")} disabled={isUpdating === order.id} className="w-full py-2 font-black bg-green-400 border-2 border-black text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all">{isUpdating === order.id ? "Memproses..." : "Kirim Barang 🚚"}</button></>
               ) : order.status === "shipped" ? ( <div className="text-center p-2 bg-blue-100 border-2 border-black"><p className="text-xs font-black uppercase text-blue-800">Sudah Di Jalan</p><p className="text-xs font-mono font-bold bg-white p-1 border border-black truncate">📦 {order.biteship_tracking_id || "Tanpa Resi"}</p></div>
               ) : order.status === "pending" ? ( <p className="text-xs font-black text-amber-700 bg-amber-100 border-2 border-black p-3 text-center uppercase">Menunggu Pembayaran</p>
               ) : ( <p className="text-xs font-black text-red-700 bg-red-100 border-2 border-black p-3 text-center uppercase">Batal ❌</p> )}
             </div>
           </div>
          ))}
        </div>
      )}

      {/* ========================================== */}
      {/* KONTEN TAB 2: GUDANG MAINAN (CRUD PRODUK) */}
      {/* ========================================== */}
      {activeTab === "products" && (
        <div className="space-y-12">
          
          {/* FORM TAMBAH / EDIT PRODUK */}
          <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black uppercase bg-yellow-300 px-2 border-2 border-black inline-block">
                {editingProductId ? "Ubah Data Mainan 🛠️" : "Tambah Mainan Baru 🧸"}
              </h2>
              {editingProductId && (
                <button onClick={() => { setEditingProductId(null); setProductForm(initialProductForm); }} className="text-xs font-black uppercase bg-red-400 text-white border-2 border-black px-2 py-1 hover:bg-black">Batal Edit</button>
              )}
            </div>

            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-1"><label className="font-bold text-sm uppercase">Nama Mainan</label><input required type="text" value={productForm.name} onChange={(e)=>setProductForm({...productForm, name: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="font-bold text-sm uppercase">Harga (Rp)</label><input required type="number" min="0" value={productForm.price} onChange={(e)=>setProductForm({...productForm, price: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none" /></div>
                  <div className="space-y-1"><label className="font-bold text-sm uppercase">Stok</label><input required type="number" min="0" value={productForm.stock} onChange={(e)=>setProductForm({...productForm, stock: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none" /></div>
                </div>
                <div className="space-y-1"><label className="font-bold text-sm uppercase">Deskripsi Singkat</label><textarea required rows={3} value={productForm.description} onChange={(e)=>setProductForm({...productForm, description: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:bg-yellow-100 outline-none resize-none" /></div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-sm uppercase">Pilih Warna Latar (*Neo Brutalism*)</label>
                  <select value={productForm.bg_color} onChange={(e)=>setProductForm({...productForm, bg_color: e.target.value})} className="w-full p-3 border-4 border-black bg-gray-50 font-bold focus:outline-none cursor-pointer">
                    <option value="bg-white">Putih Bersih (bg-white)</option>
                    <option value="bg-yellow-400">Kuning Ceria (bg-yellow-400)</option>
                    <option value="bg-pink-300">Pink Ngejreng (bg-pink-300)</option>
                    <option value="bg-blue-300">Biru Kalem (bg-blue-300)</option>
                    <option value="bg-green-400">Hijau Segar (bg-green-400)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-sm uppercase">Foto Produk Baru</label>
                  <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full p-2 border-4 border-black bg-gray-50 font-bold cursor-pointer" />
                  {productForm.image_url && !uploadFile && <p className="text-xs font-bold text-green-600 mt-1">✅ Menggunakan foto lama.</p>}
                </div>
                
                <button type="submit" disabled={isSubmittingProduct} className="w-full py-4 text-xl font-black uppercase border-4 border-black bg-blue-400 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all mt-4">
                  {isSubmittingProduct ? "Memproses..." : editingProductId ? "Simpan Perubahan 💾" : "Lempar ke Gudang 🚀"}
                </button>
              </div>
            </form>
          </div>

          {/* LIST PRODUK DI GUDANG */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black uppercase border-b-4 border-black pb-2">Daftar Mainan ({products.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((prod) => (
                <div key={prod.id} className={`border-4 border-black p-4 flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${prod.bg_color || 'bg-white'}`}>
                  <div className="bg-white border-4 border-black mb-4 h-32 flex items-center justify-center p-2">
                    <img src={prod.image_url} alt={prod.name} className="h-full object-contain" />
                  </div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-black uppercase leading-tight text-lg truncate" title={prod.name}>{prod.name}</h3>
                  </div>
                  <div className="flex justify-between items-center bg-white border-2 border-black px-2 py-1 mb-4">
                    <span className="font-black">{formatRupiah(prod.price)}</span>
                    <span className="text-xs font-bold uppercase">Stok: {prod.stock}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button onClick={() => handleEditProduct(prod)} className="py-2 text-xs font-black uppercase bg-yellow-300 border-2 border-black hover:bg-black hover:text-white transition-colors">Edit</button>
                    <button onClick={() => handleDeleteProduct(prod.id, prod.name)} className="py-2 text-xs font-black uppercase bg-red-400 text-white border-2 border-black hover:bg-black transition-colors">Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}