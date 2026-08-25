/* Open-Meteo weather + air quality for Yola, Adamawa State. No API key required. */

import { store } from "./ui.js";

export const YOLA = { lat: 9.2035, lon: 12.4954, name: "Yola, Adamawa State" };

const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=9.2035&longitude=12.4954" +
  "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain," +
  "weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m" +
  "&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code," +
  "visibility,wind_speed_10m,uv_index,apparent_temperature" +
  "&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,sunrise,sunset" +
  "&timezone=Africa%2FLagos&forecast_days=7";

const AIR_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=9.2035&longitude=12.4954" +
  "&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index,european_aqi,us_aqi" +
  "&hourly=pm2_5,pm10,dust,european_aqi&timezone=Africa%2FLagos&forecast_days=2";

export const WEATHER_CODES = {
  0: ["Clear sky", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Rime fog", "🌫️"], 51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"],
  55: ["Dense drizzle", "🌧️"], 61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"], 71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"], 80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"],
  82: ["Violent showers", "⛈️"], 95: ["Thunderstorm", "⛈️"], 96: ["Storm with hail", "⛈️"],
  99: ["Severe storm", "⛈️"],
};

export function describeCode(code) {
  return WEATHER_CODES[code] || ["Unknown", "🌡️"];
}

export function windDirection(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round((deg % 360) / 22.5) % 16];
}

export function uvBand(uv) {
  if (uv < 3) return { label: "Low", tone: "good", advice: "Safe to be outside." };
  if (uv < 6) return { label: "Moderate", tone: "fair", advice: "Wear a hat around midday." };
  if (uv < 8) return { label: "High", tone: "poor", advice: "Seek shade 11am–3pm, use sunscreen." };
  if (uv < 11) return { label: "Very high", tone: "bad", advice: "Avoid long midday sun exposure." };
  return { label: "Extreme", tone: "bad", advice: "Stay indoors between 11am and 4pm." };
}

export function aqiBand(aqi) {
  if (aqi == null) return { label: "Unknown", tone: "fair", advice: "No air-quality reading available." };
  if (aqi <= 20) return { label: "Good", tone: "good", advice: "Air is clean — enjoy outdoor activity." };
  if (aqi <= 40) return { label: "Fair", tone: "good", advice: "Acceptable for everyone." };
  if (aqi <= 60) return { label: "Moderate", tone: "fair", advice: "Sensitive groups should limit long outdoor effort." };
  if (aqi <= 80) return { label: "Poor", tone: "poor", advice: "Reduce outdoor exercise; keep windows shut midday." };
  if (aqi <= 100) return { label: "Very poor", tone: "bad", advice: "Wear a mask outdoors; asthmatics stay in." };
  return { label: "Hazardous", tone: "bad", advice: "Avoid outdoor exposure. Keep children indoors." };
}

export function humidityBand(rh) {
  if (rh < 25) return { label: "Very dry", tone: "poor" };
  if (rh < 40) return { label: "Dry", tone: "fair" };
  if (rh < 70) return { label: "Comfortable", tone: "good" };
  if (rh < 85) return { label: "Humid", tone: "fair" };
  return { label: "Very humid", tone: "poor" };
}

/** Driving clarity from visibility, rain and dust load. */
export function drivingClarity({ visibilityM, precipitation = 0, dust = 0, pm10 = 0 }) {
  const km = (visibilityM ?? 20000) / 1000;
  let score = 100;
  if (km < 1) score -= 65;
  else if (km < 3) score -= 45;
  else if (km < 6) score -= 28;
  else if (km < 10) score -= 12;

  if (precipitation > 6) score -= 25;
  else if (precipitation > 2) score -= 14;
  else if (precipitation > 0.2) score -= 6;

  const dustLoad = Math.max(dust, pm10);
  if (dustLoad > 300) score -= 30;
  else if (dustLoad > 150) score -= 18;
  else if (dustLoad > 80) score -= 9;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let band;
  if (score >= 80) band = { label: "Excellent", tone: "good", advice: "Clear roads — normal driving conditions." };
  else if (score >= 60) band = { label: "Good", tone: "good", advice: "Minor haze. Keep normal headlights at dusk." };
  else if (score >= 40) band = { label: "Fair", tone: "fair", advice: "Reduced visibility — slow down and use low beams." };
  else if (score >= 20) band = { label: "Poor", tone: "poor", advice: "Dust or rain haze. Drive slowly, use fog lights." };
  else band = { label: "Hazardous", tone: "bad", advice: "Very low visibility — postpone travel if possible." };

  return { score, visibilityKm: Math.round(km * 10) / 10, ...band };
}

async function getJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Weather service error (${res.status})`);
  return res.json();
}

/** Fetch and normalise everything the UI needs. Caches to localStorage for offline use. */
export async function fetchConditions() {
  try {
    const [forecast, air] = await Promise.all([getJSON(FORECAST_URL), getJSON(AIR_URL)]);
    const data = normalise(forecast, air);
    store.set("conditions", { data, at: Date.now() });
    return { data, stale: false, fetchedAt: Date.now() };
  } catch (err) {
    const cached = store.get("conditions");
    if (cached) return { data: cached.data, stale: true, fetchedAt: cached.at, error: err.message };
    throw err;
  }
}

function normalise(forecast, air) {
  const c = forecast.current;
  const h = forecast.hourly;
  const now = new Date();
  const nowHourIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  let startIdx = h.time.findIndex((t) => new Date(t) >= nowHourIso);
  if (startIdx < 0) startIdx = 0;

  const hours = h.time.slice(startIdx, startIdx + 24).map((t, i) => {
    const idx = startIdx + i;
    return {
      time: t,
      temp: h.temperature_2m[idx],
      feels: h.apparent_temperature[idx],
      humidity: h.relative_humidity_2m[idx],
      pop: h.precipitation_probability[idx] ?? 0,
      rain: h.precipitation[idx] ?? 0,
      code: h.weather_code[idx],
      visibility: h.visibility?.[idx],
      wind: h.wind_speed_10m[idx],
      uv: h.uv_index?.[idx] ?? 0,
    };
  });

  const a = air?.current ?? {};
  const daily = forecast.daily.time.map((t, i) => ({
    date: t,
    code: forecast.daily.weather_code[i],
    max: forecast.daily.temperature_2m_max[i],
    min: forecast.daily.temperature_2m_min[i],
    uvMax: forecast.daily.uv_index_max[i],
    rain: forecast.daily.precipitation_sum[i],
    sunrise: forecast.daily.sunrise[i],
    sunset: forecast.daily.sunset[i],
  }));

  const current = {
    time: c.time,
    temp: c.temperature_2m,
    feels: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    code: c.weather_code,
    isDay: !!c.is_day,
    cloud: c.cloud_cover,
    pressure: c.pressure_msl,
    wind: c.wind_speed_10m,
    gusts: c.wind_gusts_10m,
    windDir: c.wind_direction_10m,
    precipitation: c.precipitation,
    uv: hours[0]?.uv ?? 0,
    visibility: hours[0]?.visibility,
    sunrise: daily[0]?.sunrise,
    sunset: daily[0]?.sunset,
  };

  const airQuality = {
    aqi: a.european_aqi ?? null,
    usAqi: a.us_aqi ?? null,
    pm25: a.pm2_5 ?? null,
    pm10: a.pm10 ?? null,
    no2: a.nitrogen_dioxide ?? null,
    o3: a.ozone ?? null,
    so2: a.sulphur_dioxide ?? null,
    co: a.carbon_monoxide ?? null,
    dust: a.dust ?? null,
  };

  const clarity = drivingClarity({
    visibilityM: current.visibility,
    precipitation: current.precipitation ?? 0,
    dust: airQuality.dust ?? 0,
    pm10: airQuality.pm10 ?? 0,
  });

  return { place: YOLA.name, current, hours, daily, airQuality, clarity, units: forecast.current_units };
}

/** Environmental alerts derived from live data. */
export function deriveAlerts(data) {
  const out = [];
  if (!data) return out;
  const { current, airQuality, clarity, hours, daily } = data;

  if (current.temp >= 40) out.push({ level: "danger", icon: "🔥", title: "Extreme heat", body: `${Math.round(current.temp)}°C now. Avoid strenuous outdoor work between 11am and 4pm and drink water often.` });
  else if (current.temp >= 36) out.push({ level: "warn", icon: "🌡️", title: "High heat", body: `Feels like ${Math.round(current.feels)}°C. Take shade breaks and hydrate.` });

  const uv = uvBand(current.uv);
  if (current.uv >= 8) out.push({ level: "warn", icon: "🕶️", title: `UV index ${Math.round(current.uv)} — ${uv.label}`, body: uv.advice });

  if (airQuality.aqi != null && airQuality.aqi > 60) {
    const band = aqiBand(airQuality.aqi);
    out.push({ level: airQuality.aqi > 80 ? "danger" : "warn", icon: "😷", title: `Air quality ${band.label}`, body: band.advice });
  }

  if ((airQuality.dust ?? 0) > 150 || (airQuality.pm10 ?? 0) > 150) {
    out.push({ level: "warn", icon: "🏜️", title: "Harmattan dust haze", body: "Dust levels are elevated. Close windows, cover water containers and mask up on the road." });
  }

  if (clarity.score < 45) out.push({ level: "warn", icon: "🚗", title: `Driving visibility ${clarity.label}`, body: clarity.advice });

  const rain24 = hours.reduce((s, h) => s + (h.rain || 0), 0);
  if (rain24 > 25) out.push({ level: "danger", icon: "🌊", title: "Flood risk", body: `${rain24.toFixed(1)} mm of rain expected in 24h. Clear drains and avoid dumping waste in waterways.` });
  else if (rain24 > 8) out.push({ level: "info", icon: "🌧️", title: "Heavy rain expected", body: `${rain24.toFixed(1)} mm forecast — secure bins so waste does not wash into drains.` });

  const weekRain = daily.slice(0, 3).reduce((s, d) => s + (d.rain || 0), 0);
  if (weekRain > 60) out.push({ level: "info", icon: "🪣", title: "Wet spell ahead", body: "Rainwater harvesting is worthwhile this week — set out clean collection barrels." });

  if (!out.length) out.push({ level: "info", icon: "✅", title: "No active environmental alerts", body: "Conditions in Yola are within normal ranges right now." });
  return out;
}
