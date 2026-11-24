import { redirect } from "next/navigation";

/** Halaman Konsultan sudah dihapus. Cicilan dan Utang pindah ke fitur sendiri. */
export default function KonsultanPage() {
  redirect("/cicilan-utang");
}
