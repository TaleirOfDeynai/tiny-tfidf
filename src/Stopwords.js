/**
 * English stopwords, assuming that 1-letter tokens are already filtered out. Based on the list
 * from NLTK, found via https://gist.github.com/sebleier/554280
 */
const defaultStopwords = ['me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what',
  'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'an', 'the',
  'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
  'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'can', 'will', 'just', 'don', 'could', 'should', 'would', 'now', 'll',
  're', 've', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'mustn', 'needn',
  'shouldn', 'wasn', 'weren', 'won', 'wouldn'];

export default class Stopwords {

  /**
   * @param {boolean} [useDefaultStopwords]
   * Whether to use the default stopwords list.
   * @param {string[]} [customStopwords]
   * An array of custom stopwords to use.  When `useDefaultStopwords` is:
   * - `true`, these are added to the defaults.
   * - `false`, these are used instead of the defaults.
   */
  constructor(useDefaultStopwords = true, customStopwords = []) {
    const stopwords = useDefaultStopwords ? customStopwords.concat(defaultStopwords) : customStopwords;
    this._stopwords = new Map(stopwords.map(d => [d, true]));
  }

  /**
   * Returns `true` if the current stopword list contains the given term, or `false` otherwise.
   * 
   * @param {string} word
   * The word to query.
   * @returns {boolean}
   */
  includes(word) {
    return this._stopwords.has(word);
  }

  /**
   * Returns an array of the stopword list currently in use (for inspection or debugging).
   * 
   * @returns {string[]}
   */
  getStopwordList() {
    return Array.from(this._stopwords.keys());
  }
}
