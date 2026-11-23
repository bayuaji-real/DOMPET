import { redirect } from "next/navigation";

// Menu Pengaturan sudah digabung ke halaman More.
export default function PengaturanPage() {
  redirect("/more");
}
