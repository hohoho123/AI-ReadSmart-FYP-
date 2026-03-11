// API Base URL - change to your computer's IP
export const API_BASE_URL = 'http://192.168.1.3:8000';

// Topics for profile setup and Explore screen
// These labels are passed directly to NewsAPI as search queries
export const TOPIC_OPTIONS = [
  { id: 'technology',     label: 'Technology',     description: 'Latest tech news about the world\'s best hardware and software.',          image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=80&h=80&fit=crop' },
  { id: 'business',       label: 'Business',        description: 'Breaking business news, markets and global economy.',                       image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=80&h=80&fit=crop' },
  { id: 'health',         label: 'Health',          description: 'View the latest health news and explore articles on fitness and nutrition.', image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=80&h=80&fit=crop' },
  { id: 'science',        label: 'Science',         description: 'Discover new breakthroughs in space, biology and physics.',                  image: 'https://images.unsplash.com/photo-1532094349884-543559c0855e?w=80&h=80&fit=crop' },
  { id: 'sports',         label: 'Sports',          description: 'Sports news and live sports coverage including scores and highlights.',      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=80&h=80&fit=crop' },
  { id: 'entertainment',  label: 'Entertainment',   description: 'Celebrity news, movies, TV shows and music industry updates.',               image: 'https://images.unsplash.com/photo-1603739903239-8b6e64c3b185?w=80&h=80&fit=crop' },
  { id: 'politics',       label: 'Politics',        description: 'Opinion and analysis of American and global political events.',             image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=80&h=80&fit=crop' },
  { id: 'art',            label: 'Art',             description: 'The Art Newspaper is the journal of record for the international art world.', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=80&h=80&fit=crop' },
  { id: 'travel',         label: 'Travel',          description: 'The latest travel news on the most significant global destinations.',        image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=80&h=80&fit=crop' },
  { id: 'finance',        label: 'Finance',         description: 'The latest breaking financial news, stock markets and investment insights.', image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=80&h=80&fit=crop' },
  { id: 'environment',    label: 'Environment',     description: 'Climate change, sustainability and environmental conservation news.',         image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=80&h=80&fit=crop' },
  { id: 'food',           label: 'Food',            description: 'Recipes, restaurant reviews and the latest food culture trends.',            image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=80&h=80&fit=crop' },
  { id: 'gaming',         label: 'Gaming',          description: 'Video game reviews, previews, esports news and industry updates.',           image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=80&h=80&fit=crop' },
  { id: 'fashion',        label: 'Fashion',         description: 'Runway trends, designer news and the latest in global fashion.',             image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop' },
  { id: 'automotive',     label: 'Automotive',      description: 'Car reviews, EV news and the latest from the automotive industry.',          image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=80&h=80&fit=crop' },
  { id: 'cryptocurrency', label: 'Cryptocurrency',  description: 'Bitcoin, Ethereum and the latest in blockchain and digital assets.',         image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=80&h=80&fit=crop' },
  { id: 'education',      label: 'Education',       description: 'News on universities, edtech and global education policy and reform.',        image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=80&h=80&fit=crop' },
  { id: 'mental_health',  label: 'Mental Health',   description: 'Awareness, research and resources on mental well-being and psychology.',     image: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=80&h=80&fit=crop' },
  { id: 'space',          label: 'Space',           description: 'NASA, SpaceX, and the latest missions exploring our solar system.',          image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=80&h=80&fit=crop' },
  { id: 'cybersecurity',  label: 'Cybersecurity',   description: 'Hacking, data breaches and the latest in digital security.',                 image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=80&h=80&fit=crop' },
];

// Voice options (matches backend)
export const VOICE_OPTIONS = [
  { id: 'voice_a', name: 'George', description: 'Warm, friendly male voice' },
  { id: 'voice_b', name: 'Sarah', description: 'Soft, natural female voice' },
  { id: 'voice_c', name: 'Daniel', description: 'Clear, authoritative male voice' },
];

export const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];

export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  error: '#FF3B30',
  success: '#34C759',
};