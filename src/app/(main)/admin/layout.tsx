import * as React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-admin-root="true" className="w-full flex-1">
      {children}
    </div>
  );
}
