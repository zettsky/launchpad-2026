const axios = require('axios');

async function searchRestaurantImage(
  restaurantName,
  location = 'Singapore'
) {
  const query = `${restaurantName} ${location} restaurant`;

  const response = await axios.post(
    'https://realtime.oxylabs.io/v1/queries',
    {
      source: 'google_search',
      query,
      parse: true,
      context: [
        {
          key: 'tbm',
          value: 'isch'
        }
      ]
    },
    {
      auth: {
        username: process.env.OXYLABS_USERNAME,
        password: process.env.OXYLABS_PASSWORD
      }
    }
  );

  const results =
    response.data?.results?.[0]?.content?.results?.organic || [];

  const images = results
    .filter(result => result.high_res_image)
    .map(result => ({
      imageUrl: result.high_res_image,
      title: result.title,
      source: result.domain,
      sourceUrl: result.link
    }));

  const bestImage = images[0];

  return bestImage || null;
}

module.exports = {
  searchRestaurantImage
};