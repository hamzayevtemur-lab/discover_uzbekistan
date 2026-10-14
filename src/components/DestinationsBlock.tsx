import type { CSSProperties } from "react";
import { useI18n, type Tr } from "../lib/i18n-context";
import { DESTINATIONS, type Destination } from "../data/destinations";
import "./DestinationsBlock.css";


interface DestinationsBlockProps {
  destinations?: Destination[];
  eyebrow?: Tr;
  title?: Tr;
  subtitle?: Tr;
  allHref?: string;
}

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function DestinationsBlock({
  destinations = DESTINATIONS,
  eyebrow = { en: "Start with a city", uz: "Shahardan boshlang", ru: "Начните с города" },
  title = { en: "Where will the Silk Road take you?", uz: "Ipak yo'li sizni qayerga olib boradi?", ru: "Куда вас приведёт Шёлковый путь?" },
  subtitle = {
    en: "Six cities, six different moods. Pick one and see its sites, stays and tables in one place.",
    uz: "Oltita shahar, oltita kayfiyat. Birini tanlang va uning diqqatga sazovor joylari, mehmonxonalari va restoranlarini bir joyda ko'ring.",
    ru: "Шесть городов — шесть настроений. Выберите один и увидьте его достопримечательности, жильё и рестораны в одном месте.",
  },
  allHref = "/regions",
}: DestinationsBlockProps) {
  const { tr } = useI18n();
  return (
    <section className="dest" aria-labelledby="dest-title">
      <div className="dest__head">
        <p className="dest__eyebrow">{tr(eyebrow)}</p>
        <h2 id="dest-title" className="dest__title">
          {tr(title)}
        </h2>
        <p className="dest__subtitle">{tr(subtitle)}</p>
      </div>

      <div className="dest__grid">
        {destinations.map((d) => {
          const style = {
            "--fallback": d.fallback,
            ...(d.image ? { "--img": `url("${encodeURI(d.image)}")` } : {}),
          } as CSSProperties;

          return (
            <a key={d.id} className="dest__card" href={d.href} style={style}>
              <div className="dest__photo" />
              {d.unesco && <span className="dest__badge">UNESCO</span>}
              <div className="dest__body">
                <h3>{d.name}</h3>
                <p>{tr(d.description)}</p>
                <span className="dest__go">
                  {tr({ en: "Explore city", uz: "Shaharni kashf eting", ru: "Открыть город" })} <ArrowIcon />
                </span>
              </div>
            </a>
          );
        })}
      </div>

      <div className="dest__more">
        <a className="dest__btn" href={allHref}>
          {tr({ en: "View all regions", uz: "Barcha hududlar", ru: "Все регионы" })}
        </a>
      </div>
    </section>
  );
}
