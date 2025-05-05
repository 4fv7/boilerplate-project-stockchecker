'use strict';
const Stock = require('../models'); 
const fetch = require('node-fetch'); 

module.exports = function (app) {
  app.route('/api/stock-prices').get(async function (req, res) {
    const { stock, like } = req.query;

    if (!stock) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }

    const stocks = Array.isArray(stock) ? stock : stock.split(',');

    try {
      const stockDataPromises = stocks.map(async (symbol) => {
        // Fetch stock data from the external API
        const response = await fetch(
          `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch stock data for ${symbol}`);
        }
        const data = await response.json();

        if (!data || typeof data.symbol !== 'string' || typeof data.latestPrice !== 'number') {
          throw new Error(`Invalid stock data for ${symbol}`);
        }

        // Update likes in the database
        const update = like === 'true' ? { $addToSet: { likedBy: req.ip }, $inc: { likes: 1 } } : {};
        const stockRecord = await Stock.findOneAndUpdate(
          { stock: data.symbol },
          update,
          { new: true, upsert: true }
        );

        const likes = stockRecord.likedBy ? stockRecord.likedBy.length : 0;

        return {
          stock: data.symbol,
          price: data.latestPrice,
          likes,
        };
      });

      const stockData = await Promise.all(stockDataPromises);

      if (stockData.length === 2) {
        // Calculate relative likes for two stocks
        const [stock1, stock2] = stockData;
        stock1.rel_likes = stock1.likes - stock2.likes;
        stock2.rel_likes = stock2.likes - stock1.likes;

        return res.json({
          stockData: [
            { stock: stock1.stock, price: stock1.price, rel_likes: stock1.rel_likes },
            { stock: stock2.stock, price: stock2.price, rel_likes: stock2.rel_likes },
          ],
        });
      }

      res.json({ stockData: stockData[0] });
    } catch (error) {
      console.error('Error processing request:', error.message);
      res.status(500).json({ error: 'Failed to process request' });
    }
  });
};
