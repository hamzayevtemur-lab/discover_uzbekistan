import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useI18n, type Tr } from '../lib/i18n-context';
import { CATEGORIES, type Category } from "../data/categories";
import "./CategoryCarousel.css";

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
