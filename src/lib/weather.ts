export interface WeatherData {
  temperature: number;
  condition: string;
  windSpeed: number;
}

export const getWeatherData = async (
  latitude: string,
  longitude: string,
): Promise<WeatherData> => {
  try {
    const lat = Number.parseFloat(latitude);
    const lon = Number.parseFloat(longitude);

    const pointsResponse = await fetch(
      `https://api.weather.gov/points/${lat},${lon}`,
    );
    const pointsData = await pointsResponse.json();

    const forecastResponse = await fetch(pointsData.properties.forecast);
    const forecastData = await forecastResponse.json();

    const currentPeriod = forecastData.properties.periods[0];

    return {
      temperature: currentPeriod.temperature,
      condition: currentPeriod.shortForecast.toLowerCase(),
      windSpeed: Number.parseInt(currentPeriod.windSpeed) || 0,
    };
  } catch (error) {
    console.error("Weather API error:", error);
    throw new Error("Failed to fetch weather data");
  }
};

export const formatWeatherDisplay = (weather: WeatherData): string => {
  return `${weather.temperature}°F, ${weather.condition}, ${weather.windSpeed} mph wind`;
};
