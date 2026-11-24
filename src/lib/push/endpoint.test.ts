import { describe, it, expect } from "vitest";
import { isAllowedPushEndpoint } from "./endpoint";

describe("isAllowedPushEndpoint (serangan SSRF lewat endpoint push)", () => {
  it("menerima layanan push resmi", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
  });
  it("menolak alamat sembarang, internal, dan trik penulisan", () => {
    for (const bad of [
      "https://evil.example.com/x", "http://fcm.googleapis.com/x", "https://localhost/x", "https://127.0.0.1/x",
      "https://169.254.169.254/latest/meta-data", "https://fcm.googleapis.com.evil.com/x", "https://evil.com/fcm.googleapis.com",
      "https://user:pw@fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x", "javascript:alert(1)", "", "https://[::1]/x",
    ]) expect(isAllowedPushEndpoint(bad), bad).toBe(false);
    expect(isAllowedPushEndpoint(123)).toBe(false);
    expect(isAllowedPushEndpoint(null)).toBe(false);
  });
});
