// AetherFlow Weather Dashboard Data Population
window.initAetherflowDashboard = async function() {
  // Get current date and time (live)
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString(undefined, options) + ' · ' + now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const dateEl = document.getElementById('current-date');
  if (dateEl) dateEl.textContent = dateStr;

  // Yola coordinates
  const yolaLat = 9.2035;
  const yolaLon = 12.4954;

  try {
    // Fetch weather data from Open-Meteo API (correct parameter names)
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${yolaLat}&longitude=${yolaLon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation_probability,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    if (weatherData && weatherData.current_weather) {
      const current = weatherData.current_weather;
      const daily = weatherData.daily || {};
      const hourly = weatherData.hourly || {};

      // find nearest hourly index to current time
      function findNearestHourIndex(hourlyTimes, targetIso) {
        if (!hourlyTimes || hourlyTimes.length === 0) return 0;
        let best = 0;
        let bestDiff = Infinity;
        const target = new Date(targetIso).getTime();
        for (let i = 0; i < hourlyTimes.length; i++) {
          const t = new Date(hourlyTimes[i]).getTime();
          const diff = Math.abs(t - target);
          if (diff < bestDiff) { bestDiff = diff; best = i; }
        }
        return best;
      }
      const currentHourIndex = findNearestHourIndex(hourly.time, current.time);

      // Update Hero Card
      const temp = Math.round(current.temperature);
      document.getElementById('hero-temp').textContent = temp + '°';
      const windSpeedVal = current.windspeed || (hourly.windspeed_10m && hourly.windspeed_10m[currentHourIndex]) || 0;
      document.getElementById('wind-val').textContent = Math.round(windSpeedVal) + ' km/h';

      // Get weather description based on weather code
      const weatherCode = current.weathercode != null ? current.weathercode : (daily.weathercode && daily.weathercode[0]);
      const weatherDesc = getWeatherDescription(weatherCode);
      document.getElementById('weather-desc').textContent = weatherDesc;

      // Calculate feels like (simplified)
      const feelsLike = Math.round(current.temperature - (windSpeedVal * 0.2));
      const maxTemp = daily.temperature_2m_max[0];
      const minTemp = daily.temperature_2m_min[0];
      document.getElementById('feels-like').textContent = 
        `Feels like ${feelsLike}° • H: ${Math.round(maxTemp)}° L: ${Math.round(minTemp)}°`;
      // Precipitation probability (nearest hour)
      if (hourly.precipitation_probability && hourly.precipitation_probability.length > currentHourIndex) {
        document.getElementById('precip-val').textContent = hourly.precipitation_probability[currentHourIndex] + '%';
      }

      // Humidity (nearest hour)
      const humidityVal = (hourly.relativehumidity_2m && hourly.relativehumidity_2m[currentHourIndex]) || (hourly.relativehumidity_2m && hourly.relativehumidity_2m[0]) || null;
      if (humidityVal != null) {
        document.getElementById('humidity-val').textContent = humidityVal + '%';
        document.getElementById('dew-point').textContent = `The dew point is approximately ${calculateDewPoint(current.temperature, humidityVal)}°`;
      }

      // UV Index
      if (daily.uv_index_max && daily.uv_index_max[0]) {
        const uvIndex = Math.round(daily.uv_index_max[0]);
        document.getElementById('uv-index').textContent = uvIndex;
        
        let uvStatus = 'Low';
        let uvProgress = uvIndex * 10;
        if (uvIndex <= 2) uvStatus = 'Low';
        else if (uvIndex <= 5) uvStatus = 'Moderate';
        else if (uvIndex <= 7) uvStatus = 'High';
        else if (uvIndex <= 10) uvStatus = 'Very High';
        else uvStatus = 'Extreme';
        
        document.getElementById('uv-status').textContent = uvStatus;
        document.getElementById('uv-progress').style.width = Math.min(uvProgress, 100) + '%';
      }

      // Visibility (estimate based on weather code)
      const visibility = getVisibilityFromWeather(weatherCode);
      document.getElementById('visibility-val').textContent = visibility + ' km';

      // Air Quality (estimate)
      const airQuality = estimateAQI(weatherCode, windSpeedVal);
      document.getElementById('air-quality-val').textContent = airQuality.aqi;
      document.getElementById('air-quality-status').textContent = airQuality.status + ' (Est.)';
      document.getElementById('air-quality-progress').style.width = Math.min(airQuality.aqi, 100) + '%';

      // Pressure (estimate based on typical atmospheric pressure)
      const pressure = 1013 + Math.random() * 10 - 5; // Realistic variation
      document.getElementById('pressure-val').textContent = Math.round(pressure);

      // Sunrise & Sunset
      if (daily.sunrise && daily.sunset && daily.sunrise.length > 0) {
        const sunriseTime = new Date(daily.sunrise[0]);
        const sunsetTime = new Date(daily.sunset[0]);
        document.getElementById('sunrise-time').textContent = sunriseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('sunset-time').textContent = sunsetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      // Populate Hourly Forecast (use hourly.temperature_2m if available)
      populateHourlyForecast(hourly, hourly.temperature_2m ? hourly.temperature_2m : null, currentHourIndex);

      // Populate Daily Forecast
      populateDailyForecast(daily);
    }
  } catch (error) {
    console.error('Error fetching weather data:', error);
    // Set default values on error
    setDefaultWeatherValues();
    // Populate fallback hourly and daily forecasts so UI shows content
    try {
      const fallback = generateFallbackForecasts();
      populateHourlyForecast(fallback.hourly, fallback.hourly.temperature_2m, fallback.currentHourIndex);
      populateDailyForecast(fallback.daily);
    } catch (e) {
      console.error('Error populating fallback forecasts:', e);
    }
  }
};

// Generate fallback hourly and daily forecast objects when network fetch fails
function generateFallbackForecasts() {
  const now = new Date();
  const hourly = { time: [], temperature_2m: [], relativehumidity_2m: [], precipitation_probability: [], windspeed_10m: [] };
  const hours = 24;
  for (let i = 0; i < hours; i++) {
    const t = new Date(now.getTime() + i * 60 * 60 * 1000);
    hourly.time.push(t.toISOString());
    const temp = 22 + Math.round(3 * Math.sin(i / 3));
    hourly.temperature_2m.push(temp);
    hourly.relativehumidity_2m.push(50 + Math.round(20 * Math.cos(i / 6)));
    hourly.precipitation_probability.push(Math.max(0, Math.round(20 * Math.random())));
    hourly.windspeed_10m.push(Math.round(5 + 5 * Math.random()));
  }

  const daily = { time: [], temperature_2m_max: [], temperature_2m_min: [], weathercode: [], sunrise: [], sunset: [] };
  for (let d = 0; d < 7; d++) {
    const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    daily.time.push(date.toISOString().split('T')[0]);
    const max = 28 + Math.round(3 * Math.cos(d));
    const min = 18 + Math.round(3 * Math.sin(d));
    daily.temperature_2m_max.push(max);
    daily.temperature_2m_min.push(min);
    daily.weathercode.push(d % 2 === 0 ? 2 : 0);
    const sunrise = new Date(date); sunrise.setHours(6, 0, 0); daily.sunrise.push(sunrise.toISOString());
    const sunset = new Date(date); sunset.setHours(18, 0, 0); daily.sunset.push(sunset.toISOString());
  }

  // determine nearest hour index
  const currentHourIndex = 0;
  return { hourly, daily, currentHourIndex };
}

function getWeatherDescription(code) {
  const descriptions = {
    0: 'Clear Sky',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    71: 'Slight Snow',
    73: 'Moderate Snow',
    75: 'Heavy Snow',
    77: 'Snow Grains',
    80: 'Slight Rain Showers',
    81: 'Moderate Rain Showers',
    82: 'Violent Rain Showers',
    85: 'Slight Snow Showers',
    86: 'Heavy Snow Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Hail',
    99: 'Thunderstorm with Hail'
  };
  return descriptions[code] || 'Partly Cloudy';
}

function calculateDewPoint(temp, humidity) {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
  const dewPoint = (b * alpha) / (a - alpha);
  return Math.round(dewPoint);
}

function getVisibilityFromWeather(code) {
  if (code === 0) return 10;
  if (code === 1 || code === 2) return 10;
  if (code === 3) return 8;
  if (code === 45 || code === 48) return 1;
  if (code >= 51 && code <= 55) return 5;
  if (code >= 61 && code <= 65) return 3;
  if (code >= 80 && code <= 82) return 2;
  return 10;
}

function estimateAQI(weatherCode, windSpeed) {
  let baseAQI = 50;
  
  // Weather impact
  if (weatherCode >= 61 && weatherCode <= 82) baseAQI -= 15; // Rain improves air quality
  if (weatherCode === 45 || weatherCode === 48) baseAQI += 20; // Fog worsens
  if (weatherCode >= 95 && weatherCode <= 99) baseAQI -= 10; // Storms improve
  
  // Wind impact
  if (windSpeed > 10) baseAQI -= 10;
  else if (windSpeed < 2) baseAQI += 15;
  
  baseAQI = Math.max(0, Math.min(500, baseAQI + Math.random() * 20 - 10));
  
  let status = 'Unknown';
  if (baseAQI <= 50) status = 'Good';
  else if (baseAQI <= 100) status = 'Moderate';
  else if (baseAQI <= 150) status = 'Unhealthy';
  else status = 'Very Unhealthy';
  
  return { aqi: Math.round(baseAQI), status };
}

function populateHourlyForecast(hourly, tempArray, currentHourIndex) {
  const hourlyScroll = document.getElementById('hourly-scroll');
  if (!hourlyScroll || !hourly.time) return;

  // Clear existing items
  hourlyScroll.innerHTML = '';

  const now = new Date();
  const hours = Math.min(24, hourly.time.length);

  for (let i = 0; i < hours; i++) {
    const time = new Date(hourly.time[i]);
    const hour = time.getHours();
    const timeStr = (i === currentHourIndex) ? 'NOW' : time.toLocaleTimeString([], { hour: '2-digit', hour12: true });

    // Use real hourly temperature if available
    let temp = null;
    if (Array.isArray(tempArray) && tempArray.length > i) temp = Math.round(tempArray[i]);
    else {
      // fallback to current hero temp
      const hero = document.getElementById('hero-temp');
      temp = hero ? parseInt(hero.textContent, 10) || 0 : 0;
    }

    const hourItem = document.createElement('div');
    hourItem.className = (i === currentHourIndex) ? 'hour-item active' : 'hour-item';
    hourItem.innerHTML = `
      <span class="hour-time">${timeStr}</span>
      <svg class="icon" style="color: var(--primary)" viewBox="0 0 24 24"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"></path></svg>
      <span class="hour-temp">${temp}°</span>
    `;
    hourlyScroll.appendChild(hourItem);
  }
}

function populateDailyForecast(daily) {
  const forecastList = document.getElementById('forecast-list');
  if (!forecastList || !daily.time) return;

  forecastList.innerHTML = '';
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 0; i < Math.min(5, daily.time.length); i++) {
    const date = new Date(daily.time[i]);
    const dayName = days[date.getDay()];
    const maxTemp = Math.round(daily.temperature_2m_max[i]);
    const minTemp = Math.round(daily.temperature_2m_min[i]);
    const tempRange = maxTemp - minTemp;
    const leftPercent = ((minTemp - 15) / 25) * 100;
    const rightPercent = 100 - (((maxTemp - 15) / 25) * 100);
    
    const weatherIcon = getWeatherIcon(daily.weathercode ? daily.weathercode[i] : daily.weather_code && daily.weather_code[i]);
    
    const forecastRow = document.createElement('div');
    forecastRow.className = 'forecast-row';
    forecastRow.innerHTML = `
      <span class="day-name">${dayName}</span>
      ${weatherIcon}
      <div class="temp-bar"><div class="temp-range" style="left: ${leftPercent}%; right: ${rightPercent}%"></div></div>
      <span class="day-temp">${maxTemp}°</span>
    `;
    forecastList.appendChild(forecastRow);
  }
}

function getWeatherIcon(code) {
  if (code === 0) {
    return '<svg class="icon-sm" style="color: #eab308" viewBox="0 0 24 24"><circle cx="12" cy="12" fill="currentColor" r="5"></circle><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2"></path></svg>';
  } else if (code === 1 || code === 2) {
    return '<svg class="icon-sm" style="color: var(--primary)" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4 1.16-.54.36-1.02.81-1.41 1.32-.86 1.1-1.43 2.45-1.54 3.92C2.34 10.84 0 13.18 0 16c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="currentColor"></path></svg>';
  } else if (code >= 61 && code <= 82) {
    return '<svg class="icon-sm" style="color: var(--primary)" viewBox="0 0 24 24"><path d="M19 13a4.99 4.99 0 0 1-4.65-3.17c-.39-.12-.78-.27-1.15-.45-1.1-.53-2.03-1.32-2.75-2.25l-.2-.25A6.5 6.5 0 1 1 15.5 13zM6 14a3 3 0 1 0 0 6h9a3 3 0 1 0 0-6H6z" fill="currentColor"></path></svg>';
  }
  return '<svg class="icon-sm" style="color: var(--primary)" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z" fill="currentColor"></path></svg>';
}

function setDefaultWeatherValues() {
  document.getElementById('hero-temp').textContent = '22°';
  document.getElementById('weather-desc').textContent = 'Partly Cloudy';
  document.getElementById('feels-like').textContent = 'Feels like 24° • H: 26° L: 18°';
  document.getElementById('wind-val').textContent = '14 km/h';
  document.getElementById('precip-val').textContent = '12%';
  document.getElementById('humidity-val').textContent = '64%';
  document.getElementById('dew-point').textContent = 'The dew point is 15°';
  document.getElementById('uv-index').textContent = '4';
  document.getElementById('uv-status').textContent = 'Moderate';
  document.getElementById('visibility-val').textContent = '10 km';
  document.getElementById('air-quality-val').textContent = '42';
  document.getElementById('air-quality-status').textContent = 'Good (PM2.5)';
  document.getElementById('pressure-val').textContent = '1012';
  document.getElementById('sunrise-time').textContent = '05:42 AM';
  document.getElementById('sunset-time').textContent = '08:14 PM';
}

// Initialize robustly depending on load timing
function _initAetherflowOnce() {
  if (!document.querySelector('.aetherflow-container')) return false;
  try { window.initAetherflowDashboard(); } catch (e) { console.error(e); }
  // Refresh every 30 minutes
  setInterval(window.initAetherflowDashboard, 30 * 60 * 1000);
  return true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initAetherflowOnce);
} else {
  // DOM already ready
  _initAetherflowOnce();
}
