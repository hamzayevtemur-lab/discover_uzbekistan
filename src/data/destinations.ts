import type { Tr } from "../lib/i18n-context";

export interface Destination {
  id: string;
  name: string;
  description: Tr;
  href: string;
  unesco?: boolean;
  /** Path to a real photo, e.g. "/img/samarkand.jpg". Falls back to the gradient if omitted. */
  image?: string;
  /** CSS background shown until a photo is provided. */
  fallback: string;
}

export const DESTINATIONS: Destination[] = [
  {
    id: "samarkand",
    image: "/images/Shah-i-Zinda.jpg",
    name: "Samarkand",
    description: { en: "The Registan at sunset, turquoise domes and the heart of Timur's empire.", uz: "Registon quyosh botganda, firuza gumbazlar va Temur saltanatining yuragi.", ru: "Регистан на закате, бирюзовые купола и сердце империи Тимура." },
    href: "/cities/samarkand",
    unesco: true,
    fallback:
      "radial-gradient(circle at 70% 25%, #2c8fa8 0, transparent 38%), linear-gradient(160deg, #16405a, #0b1b2b 60%, #2a1a0c)",
  },
  {
    id: "bukhara",
    image: "/images/bukhara.jpg",
    name: "Bukhara",
    description: { en: "Trading domes and a living old town.", uz: "Savdo gumbazlari va jonli eski shahar.", ru: "Торговые купола и живой старый город." },
    href: "/cities/bukhara",
    unesco: true,
    fallback: "linear-gradient(160deg, #a8651f, #4a2410 70%)",
  },
  {
    id: "khiva",
    image: "/images/itchanqala.jpg",
    name: "Khiva",
    description: { en: "A walled city frozen in clay and tile.", uz: "Loy va koshinda qotib qolgan devorli shahar.", ru: "Город-крепость, застывший в глине и изразцах." },
    href: "/cities/khiva",
    unesco: true,
    fallback: "linear-gradient(160deg, #c48a3a, #5a3414 70%)",
  },
  {
    id: "tashkent",
    image: "/images/chorsu.jpg",
    name: "Tashkent",
    description: { en: "Metro art, bazaars and the modern capital.", uz: "Metro san'ati, bozorlar va zamonaviy poytaxt.", ru: "Искусство метро, базары и современная столица." },
    href: "/cities/tashkent",
    fallback: "linear-gradient(160deg, #2b6f6a, #0f2a2c 75%)",
  },
  {
    id: "shahrisabz",
    image: "/images/hisor.jpg",
    name: "Shahrisabz",
    description: { en: "Timur's birthplace and Ak-Saray ruins.", uz: "Temurning tug'ilgan joyi va Oqsaroy xarobalari.", ru: "Родина Тимура и руины Ак-Сарая." },
    href: "/cities/shahrisabz",
    unesco: true,
    fallback: "linear-gradient(160deg, #7a3b2a, #2a1210 75%)",
  },
  {
    id: "fergana",
    image: "/images/RishtanCeramicsCenter.jpg",
    name: "Fergana",
    description: { en: "Valley of silk, ceramics and orchards.", uz: "Ipak, kulolchilik va bog'lar vodiysi.", ru: "Долина шёлка, керамики и садов." },
    href: "/cities/fergana",
    fallback: "linear-gradient(160deg, #4f6b3a, #1a2616 75%)",
  },
];

