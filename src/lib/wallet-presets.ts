/**
 * Daftar pilihan dompet siap pakai (bank, e-wallet, investasi, tunai).
 *
 * Logo TIDAK disimpan di proyek: diambil otomatis dari ikon situs resmi
 * masing-masing (lewat layanan favicon Google). Kalau logo gagal dimuat,
 * komponen <WalletIcon> menampilkan inisial dengan warna brand.
 *
 * Cara menyimpan di database: kolom wallets.icon = "brand:<id>", contoh "brand:bca".
 * Ikon non-brand tetap memakai nama ikon lucide, contoh "banknote".
 */

export type WalletType = "bank" | "ewallet" | "cash" | "investasi";

export interface WalletPreset {
  id: string;
  name: string;
  type: WalletType;
  /** Domain situs resmi, dipakai untuk mengambil logo. Kosong = pakai ikon lucide. */
  domain?: string;
  /** Warna brand (perkiraan), dipakai untuk latar inisial & aksen kartu. */
  color: string;
  /** Inisial cadangan kalau logo gagal dimuat (maks 3 huruf). */
  initials: string;
  /** Nama ikon lucide untuk preset tanpa domain (misal Tunai). */
  lucideIcon?: string;
  /** Kata kunci pencarian tambahan. */
  keywords?: string[];
}

export const WALLET_PRESETS: WalletPreset[] = [
  // ---------- TUNAI ----------
  { id: "tunai", name: "Tunai", type: "cash", color: "#16a34a", initials: "Rp", lucideIcon: "banknote", keywords: ["cash", "dompet", "uang"] },

  // ---------- BANK UMUM ----------
  { id: "bca", name: "BCA", type: "bank", domain: "bca.co.id", color: "#005EB8", initials: "BCA", keywords: ["bank central asia", "mybca", "klikbca"] },
  { id: "mandiri", name: "Bank Mandiri", type: "bank", domain: "bankmandiri.co.id", color: "#003D79", initials: "MDR", keywords: ["livin", "mandiri"] },
  { id: "bri", name: "BRI", type: "bank", domain: "bri.co.id", color: "#00529C", initials: "BRI", keywords: ["bank rakyat indonesia", "brimo"] },
  { id: "bni", name: "BNI", type: "bank", domain: "bni.co.id", color: "#F15A23", initials: "BNI", keywords: ["bank negara indonesia", "wondr"] },
  { id: "bsi", name: "BSI", type: "bank", domain: "bankbsi.co.id", color: "#00A39D", initials: "BSI", keywords: ["bank syariah indonesia", "syariah"] },
  { id: "btn", name: "BTN", type: "bank", domain: "btn.co.id", color: "#1C3F94", initials: "BTN", keywords: ["bank tabungan negara"] },
  { id: "cimb", name: "CIMB Niaga", type: "bank", domain: "cimbniaga.co.id", color: "#EC1C24", initials: "CIM", keywords: ["octo", "cimb"] },
  { id: "permata", name: "PermataBank", type: "bank", domain: "permatabank.com", color: "#00A650", initials: "PMT", keywords: ["permata"] },
  { id: "danamon", name: "Danamon", type: "bank", domain: "danamon.co.id", color: "#F58220", initials: "DNM", keywords: ["d-bank"] },
  { id: "ocbc", name: "OCBC", type: "bank", domain: "ocbc.id", color: "#E30613", initials: "OCB", keywords: ["ocbc nisp", "nyala"] },
  { id: "maybank", name: "Maybank", type: "bank", domain: "maybank.co.id", color: "#FFC72C", initials: "MAY" },
  { id: "panin", name: "Panin Bank", type: "bank", domain: "panin.co.id", color: "#0057A8", initials: "PAN" },
  { id: "mega", name: "Bank Mega", type: "bank", domain: "bankmega.com", color: "#F7A600", initials: "MGA" },
  { id: "uob", name: "UOB / TMRW", type: "bank", domain: "uob.co.id", color: "#005EB8", initials: "UOB", keywords: ["tmrw"] },
  { id: "dbs", name: "digibank by DBS", type: "bank", domain: "dbs.id", color: "#E3001B", initials: "DBS", keywords: ["digibank"] },
  { id: "muamalat", name: "Bank Muamalat", type: "bank", domain: "bankmuamalat.co.id", color: "#5C2D91", initials: "MML", keywords: ["syariah"] },
  { id: "btpn", name: "SMBC Indonesia (BTPN)", type: "bank", domain: "btpn.com", color: "#F7941D", initials: "BTP", keywords: ["btpn", "smbc"] },

  // ---------- BANK DIGITAL ----------
  { id: "jago", name: "Bank Jago", type: "bank", domain: "jago.com", color: "#FDB813", initials: "JGO", keywords: ["jago syariah"] },
  { id: "seabank", name: "SeaBank", type: "bank", domain: "seabank.co.id", color: "#FF6A00", initials: "SEA", keywords: ["shopee"] },
  { id: "jenius", name: "Jenius", type: "bank", domain: "jenius.com", color: "#00A9E0", initials: "JNS", keywords: ["btpn", "smbc"] },
  { id: "blu", name: "blu by BCA Digital", type: "bank", domain: "blubybcadigital.id", color: "#0099FF", initials: "blu", keywords: ["bca digital"] },
  { id: "neo", name: "Bank Neo Commerce", type: "bank", domain: "bankneocommerce.co.id", color: "#FF9900", initials: "NEO", keywords: ["neobank", "bnc"] },
  { id: "allo", name: "Allo Bank", type: "bank", domain: "allobank.com", color: "#7B2CBF", initials: "ALO" },
  { id: "superbank", name: "Superbank", type: "bank", domain: "superbank.id", color: "#5B2EFF", initials: "SPB", keywords: ["grab", "ovo"] },
  { id: "krom", name: "Krom Bank", type: "bank", domain: "krom.id", color: "#111827", initials: "KRM" },
  { id: "linebank", name: "LINE Bank", type: "bank", domain: "linebank.co.id", color: "#06C755", initials: "LNE", keywords: ["hana"] },
  { id: "hibank", name: "hibank", type: "bank", domain: "hibank.co.id", color: "#00B2A9", initials: "hib" },

  // ---------- BANK DAERAH (BPD) ----------
  { id: "bankdki", name: "Bank DKI", type: "bank", domain: "bankdki.co.id", color: "#E31E24", initials: "DKI", keywords: ["jakone"] },
  { id: "bjb", name: "bank bjb", type: "bank", domain: "bankbjb.co.id", color: "#0072BC", initials: "BJB", keywords: ["jawa barat", "digi"] },
  { id: "bankjateng", name: "Bank Jateng", type: "bank", domain: "bankjateng.co.id", color: "#0066B3", initials: "JTG", keywords: ["jawa tengah"] },
  { id: "bankjatim", name: "Bank Jatim", type: "bank", domain: "bankjatim.co.id", color: "#ED1C24", initials: "JTM", keywords: ["jawa timur"] },
  { id: "bpddiy", name: "BPD DIY", type: "bank", domain: "bpddiy.co.id", color: "#00843D", initials: "DIY", keywords: ["yogyakarta", "jogja"] },

  // ---------- E-WALLET ----------
  { id: "gopay", name: "GoPay", type: "ewallet", domain: "gopay.co.id", color: "#00AED6", initials: "GP", keywords: ["gojek"] },
  { id: "ovo", name: "OVO", type: "ewallet", domain: "ovo.id", color: "#4C3494", initials: "OVO", keywords: ["grab"] },
  { id: "dana", name: "DANA", type: "ewallet", domain: "dana.id", color: "#118EEA", initials: "DNA" },
  { id: "shopeepay", name: "ShopeePay", type: "ewallet", domain: "shopeepay.co.id", color: "#EE4D2D", initials: "SPY", keywords: ["shopee"] },
  { id: "linkaja", name: "LinkAja", type: "ewallet", domain: "linkaja.id", color: "#E82529", initials: "LA" },
  { id: "astrapay", name: "AstraPay", type: "ewallet", domain: "astrapay.com", color: "#0054A6", initials: "AP" },
  { id: "isaku", name: "i.saku", type: "ewallet", domain: "isaku.co.id", color: "#E30613", initials: "iS", keywords: ["indomaret"] },
  { id: "flip", name: "Flip", type: "ewallet", domain: "flip.id", color: "#FD6542", initials: "FLP", keywords: ["transfer"] },
  { id: "jeniuspay", name: "Kartu e-money / Flazz", type: "ewallet", color: "#0EA5E9", initials: "EM", lucideIcon: "credit-card", keywords: ["e-toll", "flazz", "brizzi", "tapcash", "emoney"] },

  // ---------- INVESTASI ----------
  { id: "bibit", name: "Bibit", type: "investasi", domain: "bibit.id", color: "#00A86B", initials: "BBT", keywords: ["reksa dana", "rdpu", "sbn"] },
  { id: "bareksa", name: "Bareksa", type: "investasi", domain: "bareksa.com", color: "#1E73BE", initials: "BRK", keywords: ["reksa dana"] },
  { id: "ajaib", name: "Ajaib", type: "investasi", domain: "ajaib.co.id", color: "#1F4BFF", initials: "AJB", keywords: ["saham", "reksa dana"] },
  { id: "stockbit", name: "Stockbit", type: "investasi", domain: "stockbit.com", color: "#00AB6B", initials: "STB", keywords: ["saham"] },
  { id: "pluang", name: "Pluang", type: "investasi", domain: "pluang.com", color: "#2D60FF", initials: "PLG", keywords: ["emas", "saham as"] },
  { id: "pegadaian", name: "Pegadaian (Tabungan Emas)", type: "investasi", domain: "pegadaian.co.id", color: "#00A651", initials: "PGD", keywords: ["emas"] },
  { id: "treasury", name: "Treasury", type: "investasi", domain: "treasury.id", color: "#C9A227", initials: "TRS", keywords: ["emas"] },
  { id: "pintu", name: "Pintu", type: "investasi", domain: "pintu.co.id", color: "#0A68F4", initials: "PNT", keywords: ["kripto", "crypto"] },
  { id: "indodax", name: "Indodax", type: "investasi", domain: "indodax.com", color: "#0E2F56", initials: "IDX", keywords: ["kripto", "crypto"] },

  // ---------- LAINNYA ----------
  { id: "lainnya-bank", name: "Bank lain", type: "bank", color: "#64748b", initials: "BNK", lucideIcon: "landmark" },
  { id: "lainnya-ewallet", name: "E-wallet lain", type: "ewallet", color: "#64748b", initials: "EW", lucideIcon: "smartphone" },
  { id: "lainnya-investasi", name: "Investasi lain", type: "investasi", color: "#64748b", initials: "INV", lucideIcon: "trending-up" },
  { id: "celengan", name: "Celengan / amplop", type: "cash", color: "#d97706", initials: "CLG", lucideIcon: "piggy-bank" },
];

export const WALLET_TYPE_LABEL: Record<WalletType, string> = {
  bank: "Bank",
  ewallet: "E-wallet",
  cash: "Tunai",
  investasi: "Investasi",
};

const BRAND_PREFIX = "brand:";

export function presetToIcon(preset: WalletPreset): string {
  return preset.domain ? `${BRAND_PREFIX}${preset.id}` : preset.lucideIcon ?? "wallet";
}

export function getPresetById(id: string): WalletPreset | undefined {
  return WALLET_PRESETS.find((p) => p.id === id);
}

/** Dari nilai kolom wallets.icon → preset brand (kalau ada). */
export function getPresetFromIcon(icon?: string | null): WalletPreset | undefined {
  if (!icon?.startsWith(BRAND_PREFIX)) return undefined;
  return getPresetById(icon.slice(BRAND_PREFIX.length));
}

export function logoUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

export function searchPresets(query: string, type?: WalletType): WalletPreset[] {
  const q = query.trim().toLowerCase();
  return WALLET_PRESETS.filter((p) => {
    if (type && p.type !== type) return false;
    if (!q) return true;
    return [p.name, p.id, ...(p.keywords ?? [])].some((s) => s.toLowerCase().includes(q));
  });
}
