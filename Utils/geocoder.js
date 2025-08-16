const NodeGeocoder = require('node-geocoder');

const options = {
  provider: 'openstreetmap', // Free provider, no API key needed
  // For other providers like Google:
  // provider: 'google',
  // apiKey: 'YOUR_GOOGLE_MAPS_API_KEY', 
  formatter: null 
};

const geocoder = NodeGeocoder(options);

module.exports = geocoder;