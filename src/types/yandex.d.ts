// Minimal typings for the parts of the Yandex Maps 2.1 API used by this app.
declare namespace ymaps {
  type Coords = [number, number]
  interface GeoObject { events: { add(type: string, cb: () => void): void } }
  interface Collection {
    add(o: GeoObject): void
    remove(o: GeoObject): void
    getBounds(): [Coords, Coords] | null
  }
  class GeoObjectCollection implements GeoObject {
    events: { add(type: string, cb: () => void): void }
    add(o: GeoObject): this
    removeAll(): this
    getBounds(): [Coords, Coords] | null
  }
  class Map {
    constructor(el: string | HTMLElement, state: { center: Coords; zoom: number; controls?: string[] }, options?: object)
    geoObjects: Collection
    container: { fitToViewport(): void }
    setBounds(b: [Coords, Coords], o?: { checkZoomRange?: boolean; zoomMargin?: number }): void
    destroy(): void
  }
  class Placemark implements GeoObject {
    constructor(coords: Coords, props?: { balloonContent?: string; hintContent?: string }, options?: { preset?: string })
    events: { add(type: string, cb: () => void): void }
  }
  function ready(cb: () => void): void
}
