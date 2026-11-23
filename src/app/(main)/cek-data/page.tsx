import { notFound } from "next/navigation";
import CekDataClient from "./cek-data-client";

// Halaman diagnostik untuk pengembang: tidak tampil untuk pengguna di situs tayang.
export default function CekDataPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CekDataClient />;
}
