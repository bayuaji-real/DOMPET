"use client";

import * as React from "react";

/**
 * Menampilkan isi halaman setelah aplikasi tampil di perangkat.
 * Halaman Dompetku memakai jam, data akun, dan penyimpanan perangkat,
 * jadi tidak bisa dibangun lebih dulu di server saat build.
 */
export function MountGate({ children }: { children: React.ReactNode }) {
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return mounted ? <>{children}</> : null;
}
