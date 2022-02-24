// A base for all documents, making no assumptions about how the document needs to
// be interpreted.  As long as you can provide an array of individual words, it will
// do its job.
export default class Document {

  /**
   * @param {string[]} words
   * Expects a list of individual words that represent the document.
   */
  constructor(words) {
    this._words = words;
  
    /** @type {Map<string, number>} */
    this._termFrequencies = null;
  }

  /**
   * Internal method to count how often each term appears in this document.
   */
  _calculateTermFrequencies() {
    this._termFrequencies = new Map();
    this._words.forEach(word => {
      if (this._termFrequencies.has(word)) {
        this._termFrequencies.set(word, this._termFrequencies.get(word) + 1);
      } else {
        this._termFrequencies.set(word, 1);
      }
    });
  }

  /**
   * Returns a count of how often the given term appears in this document.
   * 
   * @param {string} term
   * The term of the query.
   * @returns {number}
   */
  getTermFrequency(term) {
    if (!this._termFrequencies) {
      this._calculateTermFrequencies();
    }
    const tf = this._termFrequencies.get(term);
    return typeof tf !== 'number' ? 0 : tf;
  }

  /**
   * Returns the total number of terms in the document (including stopwords).
   * 
   * @returns {number}
   */
  getLength() {
    return this._words.length;
  }

  /**
   * Returns an array of the unique terms that appear in the document (including stopwords).
   * 
   * @returns {string[]}
   */
  getUniqueTerms() {
    if (!this._termFrequencies) {
      this._calculateTermFrequencies();
    }
    return Array.from(this._termFrequencies.keys());
  }
}
