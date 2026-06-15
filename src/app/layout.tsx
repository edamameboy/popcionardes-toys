import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavbarCart from "../components/NavbarCart";

// Menggunakan font sans-serif yang tebal untuk kesan brutalist
const inter = Inter({ subsets: ["latin"], weight: ["400", "700", "900"] });

export const metadata: Metadata = {
  title: "Popcionardes Toys | Funko POP! Store Indonesia",
  description: "Toko Funko POP! terlengkap dan termurah se-Indonesia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {/* Navbar */}
        <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white border-b-4 border-black">
          <div className="text-2xl font-black uppercase tracking-tighter hover:-rotate-2 transition-transform cursor-pointer">
            Popcionardes Toys
          </div>
          <NavbarCart />
        </nav>

        {/* Main Content Wrapper */}
        <main className="min-h-screen">
          {children}
        </main>

        {/* Footer */}
        <footer className="p-8 text-center bg-black text-white border-t-4 border-black">
          <p className="font-bold uppercase tracking-widest text-sm">
            &copy; 2026 Popcionardes Toys.
          </p>
        </footer>
      </body>
    </html>
  );
}