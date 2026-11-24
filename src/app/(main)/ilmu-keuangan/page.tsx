import { redirect } from "next/navigation";

// Halaman lama dipecah jadi lima fitur. Alamat lama diarahkan ke yang pertama.
export default function IlmuKeuanganPage() {
  redirect("/money-planner");
}
