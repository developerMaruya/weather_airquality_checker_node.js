
const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'weather_db',
  connectionLimit: 10
});

// Function to convert temperature from Kelvin to Celsius
function kelvinToCelsius(kelvin) {
  const celsius = (kelvin - 273.15).toFixed(2);
  return `${celsius}°C`;
}

// Function to format the date and time in Indian format
function formatDateIndian(date) {
  const options = {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  };

  return date.toLocaleString('en-IN', options);
}

app.get('/weather/:city', async (req, res) => {
  const city = req.params.city;

  try {
    // Retrieve the air quality data
    const airQualityResponse = await axios.get(`https://api.openaq.org/v2/latest?city=${city}`);
    const airQualityData = airQualityResponse.data;

    if (
      !airQualityData.results ||
      airQualityData.results.length === 0 ||
      !airQualityData.results[0].measurements ||
      airQualityData.results[0].measurements.length === 0
    ) {
      // Air quality data not found for the city
      return res.status(404).json({ error: 'Air quality data not available for the specified city' });
    }

    const airQuality = airQualityData.results[0].measurements[0].value;

    // Retrieve the weather data
    const weatherResponse = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=7a3253e681737f5604723e2a57757a43

    `);
    const weatherData = weatherResponse.data;

    if (weatherData.cod !== 200) {
      // Weather data not found or API error
      return res.status(404).json({ error:'Weather data not available for the specified city'});
    }

    const temperature = kelvinToCelsius(weatherData.main.temp);
    const humidity = weatherData.main.humidity;

    // Store the data in the database
    const connection = await pool.getConnection();
    const query = `INSERT INTO weather (city, temperature, humidity, air_quality, generated_at) VALUES (?, ?, ?, ?, ?)`;
    const values = [city, temperature, humidity, airQuality, formatDateIndian(new Date())];
    await connection.query(query, values);
    connection.release();
    res.send({
      city,
      temperature,
      humidity,
      air_quality: airQuality,
      generated_at: formatDateIndian(new Date())
    });
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('An unhandled error occurred:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});


