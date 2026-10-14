import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useI18n, type Tr } from "../lib/i18n";
import "./CategoryCarousel.css";

export interface Category {
  id: string;
  title: Tr;
  description: Tr;
  cta: Tr;
  href: string;
  icon: ReactNode;
  /** Photo from /public/images. The gradient shows if it is missing. */
  image?: string;
  fallback: string;
  /** Highlights the card in red (used for Emergency). */
  urgent?: boolean;
}

const svg = (children: ReactNode) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const CATEGORIES: Category[] = [
  {
    id: "sites",
    title: { en: "Historical Sites", uz: "Tarixiy joylar", ru: "Исторические места" },
    description: { en: "Explore 2,500+ years of history", uz: "2,500+ yillik tarixni kashf eting", ru: "Более 2 500 лет истории" },
    cta: { en: "Explore", uz: "Ko'rish", ru: "Смотреть" },
    href: "/attractions",
    image: "/images/historylogo.png",
    fallback: "linear-gradient(160deg, #b9792a, #3c200c 80%)",
    icon: svg(<path d="M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6" />),
  },
  {
    id: "food",
    title: { en: "Restaurants", uz: "Restoranlar", ru: "Рестораны" },
    description: { en: "Taste authentic Uzbek cuisine", uz: "Haqiqiy o'zbek taomlarini tatib ko'ring", ru: "Попробуйте настоящую узбекскую кухню" },
    cta: { en: "Find food", uz: "Ovqat topish", ru: "Найти еду" },
    href: "/restaurants",
    image: "/images/restaurantlogo.jpg",
    fallback: "linear-gradient(160deg, #a24a22, #2c120a 80%)",
    icon: svg(<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v6M9 3v6M17 21V3c-2 1-3.5 3.5-3.5 7 0 2 1 3 3.5 3" />),
  },
  {
    id: "stays",
    title: { en: "Hotels & Stays", uz: "Mehmonxonalar", ru: "Отели" },
    description: { en: "Book your perfect accommodation", uz: "O'zingizga mos joyni toping", ru: "Забронируйте идеальное жильё" },
    cta: { en: "Book now", uz: "Bron qilish", ru: "Забронировать" },
    href: "/hotels",
    image: "/images/hotels.jpg",
    fallback: "linear-gradient(160deg, #c48a3a, #4a2a10 80%)",
    icon: svg(<path d="M3 20V6M3 14h18v6M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5h.01" />),
  },
  {
    id: "agencies",
    title: { en: "Travel Agencies", uz: "Sayohat agentliklari", ru: "Турагентства" },
    description: { en: "Guided tours & travel packages", uz: "Yo'lboshchi bilan sayohatlar", ru: "Туры и путевки с гидом" },
    cta: { en: "View agencies", uz: "Agentliklar", ru: "Агентства" },
    href: "/travel-agencies",
    image: "/images/travel_agency.jpg",
    fallback: "linear-gradient(160deg, #2c7f8f, #0d2a33 80%)",
    icon: svg(<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.500 18.500 12 21c-2.500-2.500-3.800-5.500-3.800-9S9.500 5.500 12 3Z" />),
  },
  {
    id: "transport",
    title: { en: "Transportation", uz: "Transport", ru: "Транспорт" },
    description: { en: "Travel between cities easily", uz: "Shaharlar orasida sayohat qiling", ru: "Легко путешествуйте между городами" },
    cta: { en: "View routes", uz: "Yo'nalishlar", ru: "Маршруты" },
    href: "/routes",
    image: "/images/transportation.webp",
    fallback: "linear-gradient(160deg, #3b5f7a, #0f1a26 80%)",
    icon: svg(<path d="M6 17V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v11H6ZM6 12h12M9 21l1.500-4M15 21l-1.500-4M9 8h.01M15 8h.01" />),
  },
  {
    id: "guides",
    title: { en: "Local Guides", uz: "Mahalliy qo'llanma", ru: "Местные гиды" },
    description: { en: "Tips, customs & local advice", uz: "Maslahatlar va ma'lumotlar", ru: "Советы, обычаи и рекомендации" },
    cta: { en: "Learn more", uz: "Ko'proq", ru: "Подробнее" },
    href: "/guides",
    image: "/images/guide.webp",
    fallback: "linear-gradient(160deg, #5f7a3b, #1a2410 80%)",
    icon: svg(<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />),
  },
  {
    id: "emergency",
    title: { en: "Emergency", uz: "Favqulodda raqamlar", ru: "Экстренные службы" },
    description: { en: "Police, ambulance & tourist help", uz: "Politsiya, tez yordam va turistik yordam", ru: "Полиция, скорая и помощь туристам" },
    cta: { en: "See contacts", uz: "Ko'rish", ru: "Контакты" },
    href: "/emergency",
    image: "/images/emergency.webp",
    urgent: true,
    fallback: "linear-gradient(160deg, #7a1f1f, #1c0808 85%)",
    icon: svg(<path d="M12 8v5M12 16.500h.01M10.300 3.900 2.500 17.500A2 2 0 0 0 4.200 20.500h15.600a2 2 0 0 0 1.700-3L13.700 3.900a2 2 0 0 0-3.400 0Z" />),
  },
];

const ArrowIcon = ({ flip = false }: { flip?: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={flip ? { transform: "scaleX(-1)" } : undefined}
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

interface Props {
  categories?: Category[];
  eyebrow?: Tr;
  title?: Tr;
}

export default function CategoryCarousel({
  categories = CATEGORIES,
  eyebrow = { en: "Everything you need", uz: "Sizga kerak bo'lgan hamma narsa", ru: "Всё, что вам нужно" },
  title = { en: "What are you looking for?", uz: "Nimani qidiryapsiz?", ru: "Что вы ищете?" },
}: Props) {
  const { tr } = useI18n();
  const trackRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".cat__card");
    const step = (card?.offsetWidth ?? 300) + 18;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  return (
    <section className="cat" aria-labelledby="cat-title">
      <div className="cat__head">
        <div>
          <p className="cat__eyebrow">{tr(eyebrow)}</p>
          <h2 id="cat-title" className="cat__title">
            {tr(title)}
          </h2>
        </div>
        <div className="cat__nav">
          <button type="button" aria-label={tr({ en: "Previous", uz: "Oldingi", ru: "Назад" })} onClick={() => scrollByCard(-1)} disabled={!canPrev}>
            <ArrowIcon flip />
          </button>
          <button type="button" aria-label={tr({ en: "Next", uz: "Keyingi", ru: "Вперёд" })} onClick={() => scrollByCard(1)} disabled={!canNext}>
            <ArrowIcon />
          </button>
        </div>
      </div>

      <ul className="cat__track" ref={trackRef} onScroll={update}>
        {categories.map((c, i) => {
          const style = {
            "--fallback": c.fallback,
            ...(c.image ? { "--img": `url("${encodeURI(c.image)}")` } : {}),
          } as CSSProperties;

          return (
            <li key={c.id} className="cat__item">
              <Link className={`cat__card${c.urgent ? " cat__card--urgent" : ""}`} to={c.href} style={style}>
                <div className="cat__photo" />
                <div className="cat__top">
                  <span className="cat__index">{String(i + 1).padStart(2, "0")}</span>
                  <span className="cat__icon">{c.icon}</span>
                </div>
                <div className="cat__body">
                  <h3>{tr(c.title)}</h3>
                  <p>{tr(c.description)}</p>
                  <span className="cat__cta">
                    {tr(c.cta)} <ArrowIcon />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
