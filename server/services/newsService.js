const axios = require('axios');
const { generateAnswer } = require('./embedService');
const NewsCache = require('../models/NewsCache');

exports.fetchAndSentimentTagNews = async (supplier) => {
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(supplier.name)}&language=en&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    const articles = response.data.articles;

    for (const article of articles) {
      // Use Gemini to tag sentiment
      const sentimentPrompt = `Classify the sentiment of this headline as 'positive', 'neutral', or 'negative' regarding the company ${supplier.name}. Output only the word. Headline: ${article.title}`;
      const sentiment = (await generateAnswer(sentimentPrompt)).toLowerCase().trim();

      await NewsCache.create({
        supplierId: supplier._id,
        headline: article.title,
        url: article.url,
        sentiment: sentiment,
        source: article.source.name,
        publishedAt: new Date(article.publishedAt)
      });
    }
  } catch (err) {
    console.error(`News error for ${supplier.name}:`, err.message);
  }
};