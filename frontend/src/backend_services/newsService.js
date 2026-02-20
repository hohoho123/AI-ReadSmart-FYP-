import api from './api';

export const newsService = {
  // Personalized feed (Phase 5-6)
  async getFeed(page = 1) {
    const response = await api.get('/news/feed', { params: { page } });
    return { articles: response.data.articles, count: response.data.count };
  },

  // Headlines by category
  async getHeadlines(category = null, page = 1, pageSize = 20) {
    const response = await api.get('/news/headlines', {
      params: { category, page, page_size: pageSize },
    });
    return { articles: response.data.articles, count: response.data.count };
  },

  // Search
  async searchNews(query, page = 1) {
    const response = await api.get('/news/search', {
      params: { q: query, page },
    });
    return { articles: response.data.articles, count: response.data.count };
  },

  // Save article
  async saveArticle(articleId) {
    const response = await api.post('/news/save', null, {
      params: { article_id: articleId },
    });
    return { success: true };
  },

  // Get saved articles
  async getSavedArticles(page = 1) {
    const response = await api.get('/news/saved', { params: { page } });
    return { articles: response.data.articles, count: response.data.count };
  },

  // Unsave article
  async unsaveArticle(articleId) {
    const response = await api.delete(`/news/saved/${articleId}`);
    return { success: true };
  },
};