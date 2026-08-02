const axios = require('axios');
const NewsCache = require('../models/NewsCache');
const { classifyHeadlineSentiment } = require('./sentimentService');

const CURRENTS_BASE_URL = 'https://api.currentsapi.services/v1/search';

// Fetches recent news for a supplier by name, classifies each article's
// sentiment, and stores new articles in NewsCache (org-scoped, deduplicated
// by supplierId+url so repeated runs don't create duplicate entries for
// articles already seen). A missing key or failed fetch is not thrown -
// callers (the cron job, the manual refresh endpoint) both need to keep
// going for other suppliers even if one fails.
exports.fetchAndSentimentTagNews = async (supplier) => {
  if (!process.env.CURRENTS_API_KEY) {
    console.warn(`Skipping news fetch for "${supplier.name}": CURRENTS_API_KEY not set`);
    return { fetched: 0, stored: 0 };
  }

  let articles;
  try {
    const response = await axios.get(CURRENTS_BASE_URL, {
      params: {
        keywords: supplier.name,
        language: 'en',
        page_size: 5,
        apiKey: process.env.CURRENTS_API_KEY,
      },
    });
    articles = response.data.news || [];
  } catch (err) {
    console.error(`News fetch failed for "${supplier.name}":`, err.response?.data?.message || err.message);
    return { fetched: 0, stored: 0 };
  }

  let stored = 0;
  for (const article of articles) {
    try {
      const alreadyStored = await NewsCache.findOne({ supplierId: supplier._id, url: article.url });
      if (alreadyStored) continue;

      let sentiment = null;
      let sentimentScore = null;
      try {
        const classified = await classifyHeadlineSentiment(supplier.name, article.title);
        sentiment = classified.label;
        sentimentScore = classified.score;
      } catch (sentimentErr) {
        // Graceful degradation, matching the embedding-failure pattern from
        // Phase 2: a single article's sentiment classification failing must
        // never block storing the article itself.
        console.error(`Sentiment classification failed for "${article.title}":`, sentimentErr.message);
      }

      // Currents doesn't return a separate publisher name field - fall back
      // to the article's domain when no author byline is present.
      const source = article.author || new URL(article.url).hostname;

      await NewsCache.create({
        supplierId: supplier._id,
        orgId: supplier.orgId,
        headline: article.title,
        url: article.url,
        source,
        sentiment,
        sentimentScore,
        publishedAt: article.published ? new Date(article.published) : new Date(),
      });
      stored += 1;
    } catch (articleErr) {
      // Per-article isolation: one bad article must not lose the rest of the batch.
      console.error(`Failed to store article "${article.title}" for "${supplier.name}":`, articleErr.message);
    }
  }

  return { fetched: articles.length, stored };
};
