// ─── Weather: WMO codes + rain period calculations ───────────

export const WMO = {
  0:  {label:"Clear sky",          emoji:"☀️",  rain:false},
  1:  {label:"Mainly clear",       emoji:"🌤️",  rain:false},
  2:  {label:"Partly cloudy",      emoji:"⛅",  rain:false},
  3:  {label:"Overcast",           emoji:"☁️",  rain:false},
  45: {label:"Fog",                emoji:"🌫️",  rain:false},
  48: {label:"Rime fog",           emoji:"🌫️",  rain:false},
  51: {label:"Light drizzle",      emoji:"🌦️",  rain:true},
  53: {label:"Drizzle",            emoji:"🌦️",  rain:true},
  55: {label:"Heavy drizzle",      emoji:"🌧️",  rain:true},
  61: {label:"Light rain",         emoji:"🌧️",  rain:true},
  63: {label:"Rain",               emoji:"🌧️",  rain:true},
  65: {label:"Heavy rain",         emoji:"🌧️",  rain:true},
  71: {label:"Light snow",         emoji:"🌨️",  rain:false},
  73: {label:"Snow",               emoji:"❄️",  rain:false},
  75: {label:"Heavy snow",         emoji:"❄️",  rain:false},
  77: {label:"Snow grains",        emoji:"🌨️",  rain:false},
  80: {label:"Rain showers",       emoji:"🌦️",  rain:true},
  81: {label:"Rain showers",       emoji:"🌧️",  rain:true},
  82: {label:"Violent showers",    emoji:"⛈️",  rain:true},
  85: {label:"Snow showers",       emoji:"🌨️",  rain:false},
  86: {label:"Heavy snow showers", emoji:"❄️",  rain:false},
  95: {label:"Thunderstorm",       emoji:"⛈️",  rain:true},
  96: {label:"Thunderstorm+hail",  emoji:"⛈️",  rain:true},
  99: {label:"Thunderstorm+hail",  emoji:"⛈️",  rain:true},
};

export function wmo(code) {
  return WMO[code] || { label:"Unknown", emoji:"🌡️", rain:false };
}

// Build rain periods from hourly data for a given date
export function calcRainPeriods(hourly, date) {
  if (!hourly?.time) return [];
  const periods = [];
  let start = null, mmAcc = 0;
  hourly.time.forEach((t, i) => {
    if (!t.startsWith(date)) return;
    const mm = hourly.precipitation[i] || 0;
    const isRain = mm > 0.05;
    if (isRain && start === null) { start = t.slice(11,16); mmAcc = mm; }
    else if (isRain) { mmAcc += mm; }
    else if (!isRain && start !== null) {
      periods.push({ from:start, to:t.slice(11,16), mm:+mmAcc.toFixed(1) });
      start = null; mmAcc = 0;
    }
  });
  if (start !== null) periods.push({ from:start, to:"21:00", mm:+mmAcc.toFixed(1) });
  return periods;
}
