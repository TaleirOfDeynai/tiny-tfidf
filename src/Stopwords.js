/**
 * A wrapper around a {@link Set} that stores stopwords.
 */
export default class Stopwords {

  /**
   * @param {string[]} [terms]
   * The terms to use as stopwords.
   */
  constructor(terms) {
    this._stopwords = new Set(terms);
  }

  /**
   * Converts the given value into a {@link Stopwords} instance, only invoking the constructor
   * when it is not an instance.
   * 
   * @param {Stopwords | string[] | undefined} stopwordsOrTerms
   * A {@link Stopwords} instance or an array of strings to build one from.
   * When `undefined`, it will build an empty instance.
   * @returns {Stopwords}
   */
  static from(stopwordsOrTerms) {
    if (!stopwordsOrTerms) return new Stopwords([]);
    if (stopwordsOrTerms instanceof Stopwords) return stopwordsOrTerms;
    return new Stopwords(stopwordsOrTerms);
  }

  /**
   * Creates a new {@link Stopwords} instance that includes additional stopwords.
   * 
   * @param {Iterable<string>} additionalStopwords
   * An iterable of additional words to combine with this instance.
   * @returns {Stopwords}
   */
  with(additionalStopwords) {
    return new Stopwords([...this._stopwords, ...additionalStopwords]);
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
    return Array.from(this._stopwords);
  }
}
