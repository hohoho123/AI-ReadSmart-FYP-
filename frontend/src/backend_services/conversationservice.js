import api from './api';

export const conversationService = {
  // Chat with AI (Phase 7-8)
  async chat(message, articleId, articleTitle, articleContent, history = []) {
    const response = await api.post('/conversation/chat', {
      message,
      article_id: articleId,
      article_title: articleTitle,
      article_content: articleContent,
      conversation_history: history,
    });
    return { success: true, response: response.data.response };
  },

  // Save conversation (Phase 9)
  async save(articleId, articleTitle, articleUrl, messages) {
    const response = await api.post('/conversation/save', {
      article_id: articleId,
      article_title: articleTitle,
      article_url: articleUrl,
      messages,
    });
    return { success: true, conversationId: response.data.conversation_id };
  },

  // Get saved conversations (Phase 10)
  async getSaved() {
    const response = await api.get('/conversation/saved');
    return { conversations: response.data.conversations, count: response.data.count };
  },

  // Get single conversation
  async getById(conversationId) {
    const response = await api.get(`/conversation/${conversationId}`);
    return response.data.conversation;
  },

  // Delete conversation (Phase 11)
  async delete(conversationId) {
    await api.delete(`/conversation/${conversationId}`);
    return { success: true };
  },

  // Smart Recap (Phase 12)
  async smartRecap(conversationId, message, newArticleText = null, originalArticleText = null, latestArticleUrl = null) {
    const response = await api.post(`/conversation/${conversationId}/followup`, {
      message,
      new_article_text: newArticleText,
      original_article_text: originalArticleText,
      latest_article_url: latestArticleUrl,
    });
    return { success: true, response: response.data.response };
  },
};