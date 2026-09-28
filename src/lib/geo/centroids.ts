/** Approximate centroids [latitude, longitude] for plotting markets on the globe. */
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US: [39.8, -98.6], CA: [56.1, -106.3], MX: [23.6, -102.5], BR: [-14.2, -51.9], AR: [-38.4, -63.6], CL: [-35.7, -71.5], CO: [4.6, -74.3],
  PE: [-9.2, -75.0], VE: [6.4, -66.6], EC: [-1.8, -78.2], BO: [-16.3, -63.6], PY: [-23.4, -58.4], UY: [-32.5, -55.8], CR: [9.7, -83.8],
  PA: [8.5, -80.8], GT: [15.8, -90.2], HN: [15.2, -86.2], SV: [13.8, -88.9], NI: [12.9, -85.2], DO: [18.7, -70.2], CU: [21.5, -77.8],
  JM: [18.1, -77.3], PR: [18.2, -66.6], TT: [10.7, -61.2], BS: [25.0, -77.4],
  GB: [54.0, -2.5], IE: [53.4, -8.2], FR: [46.2, 2.2], DE: [51.2, 10.4], ES: [40.5, -3.7], PT: [39.4, -8.2], IT: [41.9, 12.6], NL: [52.1, 5.3],
  BE: [50.5, 4.5], LU: [49.8, 6.1], CH: [46.8, 8.2], AT: [47.5, 14.6], DK: [56.3, 9.5], NO: [60.5, 8.5], SE: [60.1, 18.6], FI: [61.9, 25.7],
  IS: [64.9, -19.0], PL: [51.9, 19.1], CZ: [49.8, 15.5], SK: [48.7, 19.7], HU: [47.2, 19.5], RO: [45.9, 24.9], BG: [42.7, 25.5], GR: [39.1, 21.8],
  RS: [44.0, 21.0], HR: [45.1, 15.2], SI: [46.2, 15.0], BA: [43.9, 17.7], AL: [41.2, 20.2], MK: [41.6, 21.7], UA: [48.4, 31.2], BY: [53.7, 27.9],
  LT: [55.2, 23.9], LV: [56.9, 24.6], EE: [58.6, 25.0], MD: [47.4, 28.4], RU: [61.5, 105.3], TR: [39.0, 35.2], CY: [35.1, 33.4], MT: [35.9, 14.4],
  GE: [42.3, 43.4], AM: [40.1, 45.0], AZ: [40.1, 47.6], KZ: [48.0, 66.9], UZ: [41.4, 64.6],
  IN: [20.6, 79.0], PK: [30.4, 69.3], BD: [23.7, 90.4], LK: [7.9, 80.8], NP: [28.4, 84.1], CN: [35.9, 104.2], JP: [36.2, 138.3], KR: [35.9, 127.8],
  TW: [23.7, 121.0], HK: [22.3, 114.2], SG: [1.35, 103.8], MY: [4.2, 102.0], TH: [15.9, 100.9], VN: [14.1, 108.3], PH: [12.9, 121.8],
  ID: [-0.8, 113.9], KH: [12.6, 104.9], MM: [21.9, 95.9], MN: [46.9, 103.8], AU: [-25.3, 133.8], NZ: [-40.9, 174.9], FJ: [-17.7, 178.1],
  AE: [23.4, 53.8], SA: [23.9, 45.1], QA: [25.4, 51.2], KW: [29.3, 47.5], BH: [26.0, 50.6], OM: [21.5, 55.9], IL: [31.0, 34.9], JO: [30.6, 36.2],
  LB: [33.9, 35.9], IQ: [33.2, 43.7], IR: [32.4, 53.7], AF: [33.9, 67.7],
  EG: [26.8, 30.8], MA: [31.8, -7.1], DZ: [28.0, 1.7], TN: [33.9, 9.5], NG: [9.1, 8.7], GH: [7.9, -1.0], KE: [0.0, 37.9], ET: [9.1, 40.5],
  ZA: [-30.6, 22.9], TZ: [-6.4, 34.9], UG: [1.4, 32.3], RW: [-1.9, 29.9], SN: [14.5, -14.5], CI: [7.5, -5.5], CM: [7.4, 12.4], ZW: [-19.0, 29.2],
  ZM: [-13.1, 27.8], MZ: [-18.7, 35.5], AO: [-11.2, 17.9], NA: [-22.9, 18.5], BW: [-22.3, 24.7], MU: [-20.3, 57.6],
};

/** US states by the region name GA4 reports. */
export const US_STATE_CENTROIDS: Record<string, [number, number]> = {
  Alabama: [32.8, -86.8], Alaska: [64.2, -152.5], Arizona: [34.2, -111.7], Arkansas: [34.9, -92.4], California: [37.2, -119.5],
  Colorado: [39.0, -105.5], Connecticut: [41.6, -72.7], Delaware: [39.0, -75.5], "District of Columbia": [38.9, -77.0], Florida: [28.6, -82.4],
  Georgia: [32.7, -83.4], Hawaii: [20.8, -156.3], Idaho: [44.4, -114.6], Illinois: [40.0, -89.2], Indiana: [39.9, -86.3], Iowa: [42.1, -93.5],
  Kansas: [38.5, -98.4], Kentucky: [37.5, -85.3], Louisiana: [31.1, -92.0], Maine: [45.4, -69.2], Maryland: [39.1, -76.8], Massachusetts: [42.3, -71.8],
  Michigan: [44.3, -85.4], Minnesota: [46.3, -94.3], Mississippi: [32.7, -89.7], Missouri: [38.4, -92.5], Montana: [47.1, -109.6], Nebraska: [41.5, -99.8],
  Nevada: [39.3, -116.6], "New Hampshire": [43.7, -71.6], "New Jersey": [40.2, -74.7], "New Mexico": [34.4, -106.1], "New York": [42.9, -75.5],
  "North Carolina": [35.6, -79.4], "North Dakota": [47.5, -100.5], Ohio: [40.3, -82.8], Oklahoma: [35.6, -97.5], Oregon: [43.9, -120.6],
  Pennsylvania: [40.9, -77.8], "Rhode Island": [41.7, -71.5], "South Carolina": [33.9, -80.9], "South Dakota": [44.4, -100.2], Tennessee: [35.9, -86.4],
  Texas: [31.5, -99.3], Utah: [39.3, -111.7], Vermont: [44.1, -72.7], Virginia: [37.5, -78.9], Washington: [47.4, -120.5], "West Virginia": [38.6, -80.6],
  Wisconsin: [44.6, -89.9], Wyoming: [43.0, -107.6],
};

export type GlobePoint = { label: string; lat: number; lon: number; sessions: number; keyEvents: number };

type Market = { id: string; name: string; sessions: number; keyEvents: number };

/**
 * Plot points: US traffic is split by state (local businesses are rarely
 * spread across countries); every other country is one point.
 */
export function globePoints(countries: Market[], regions: Market[]): GlobePoint[] {
  const points: GlobePoint[] = [];
  const usStates = regions.filter((r) => r.id.startsWith("US|") && US_STATE_CENTROIDS[r.name]);
  for (const country of countries) {
    if (country.id === "US" && usStates.length > 0) {
      for (const state of usStates) {
        const [lat, lon] = US_STATE_CENTROIDS[state.name];
        points.push({ label: `${state.name}, US`, lat, lon, sessions: state.sessions, keyEvents: state.keyEvents });
      }
      continue;
    }
    const centroid = COUNTRY_CENTROIDS[country.id];
    if (centroid) points.push({ label: country.name, lat: centroid[0], lon: centroid[1], sessions: country.sessions, keyEvents: country.keyEvents });
  }
  return points.sort((a, b) => b.sessions - a.sessions).slice(0, 60);
}
