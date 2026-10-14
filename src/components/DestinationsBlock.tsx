import type { CSSProperties } from "react";
import "./DestinationsBlock.css";

export interface Destination {
  id: string;
  name: string;
  description: string;
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
    description: "The Registan at sunset, turquoise domes and the heart of Timur's empire.",
    href: "/cities/samarkand",
    unesco: true,
    fallback:
      "radial-gradient(circle at 70% 25%, #2c8fa8 0, transparent 38%), linear-gradient(160deg, #16405a, #0b1b2b 60%, #2a1a0c)",
  },
  {
    id: "bukhara",
    image: "/images/bukhara.jpg",
    name: "Bukhara",
    description: "Trading domes and a living old town.",
    href: "/cities/bukhara",
    unesco: true,
    fallback: "linear-gradient(160deg, #a8651f, #4a2410 70%)",
  },
  {
    id: "khiva",
    image: "/images/itchanqala.jpg",
    name: "Khiva",
    description: "A walled city frozen in clay and tile.",
    href: "/cities/khiva",
    unesco: true,
    fallback: "linear-gradient(160deg, #c48a3a, #5a3414 70%)",
  },
  {
    id: "tashkent",
    image: "/images/chorsu.jpg",
    name: "Tashkent",
    description: "Metro art, bazaars and the modern capital.",
    href: "/cities/tashkent",
    fallback: "linear-gradient(160deg, #2b6f6a, #0f2a2c 75%)",
  },
  {
    id: "shahrisabz",
    image: "/images/hisor.jpg",
    name: "Shahrisabz",
    description: "Timur's birthplace and Ak-Saray ruins.",
    href: "/cities/shahrisabz",
    unesco: true,
    fallback: "linear-gradient(160deg, #7a3b2a, #2a1210 75%)",
  },
  {
    id: "fergana",
    image: "/images/RishtanCeramicsCenter.jpg",
    name: "Fergana",
    description: "Valley of silk, ceramics and orchards.",
    href: "/cities/fergana",
    fallback: "linear-gradient(160deg, #4f6b3a, #1a2616 75%)",
  },
];

interface DestinationsBlockProps {
  destinations?: Destination[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
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
  eyebrow = "Start with a city",
  title = "Where will the Silk Road take you?",
  subtitle = "Six cities, six different moods. Pick one and see its sites, stays and tables in one place.",
  allHref = "/regions",
}: DestinationsBlockProps) {
  return (
    <section className="dest" aria-labelledby="dest-title">
      <div className="dest__head">
        <p className="dest__eyebrow">{eyebrow}</p>
        <h2 id="dest-title" className="dest__title">
          {title}
        </h2>
        <p className="dest__subtitle">{subtitle}</p>
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
                <p>{d.description}</p>
                <span className="dest__go">
                  Explore city <ArrowIcon />
                </span>
              </div>
            </a>
          );
        })}
      </div>

      <div className="dest__more">
        <a className="dest__btn" href={allHref}>
          View all regions
        </a>
      </div>
    </section>
  );
}
