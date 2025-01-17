import Document from './Document.js';
import TextDocument from './TextDocument.js';
import Stopwords from './Stopwords.js';

/**
 * @typedef CorpusOptions
 * @prop {string[] | Stopwords} [stopwords]
 * The stopwords to use.  Will initialize empty unless provided.
 * You must import and provide the `defaultStopwords` if they are wanted.
 * @prop {number} [K1]
 * Modifies term frequency (higher values increase the influence).  Defaults to `2.0`.
 * @prop {number} [b]
 * Modifies document length (between 0 and 1; 1 means that long documents are repetitive and
 * 0 means they are multitopic).  Defaults to `0.75`.
 */

/**
 * An object holding our defaults for later composition.
 * 
 * @type {Required<CorpusOptions>}
 */
const defaultOptions = {
  stopwords: [],
  K1: 2.0,
  b: 0.75
};

/**
 * Implements TF-IDF (Term Frequency - Inverse Document Frequency) using BM25 weighting, from:
 * https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-356.pdf
 *
 * Calculates term frequencies, term weights, and term vectors, and can return results for a given
 * query. Creates a Document for every text and also manages stopwords for the collection.
 * 
 * @template {Document} TDoc
 * The type of the document.
 */
export default class Corpus {

  /**
   * @param {Iterable<[string, TDoc]>} documents
   * An iterable of key-value-pairs, an identifier to a {@link Document}.
   * @param {CorpusOptions} [options]
   * An object to define initialization options.
   */
  constructor(documents, options) {
    const config = { ...defaultOptions, ...options };
    this._stopwords = Stopwords.from(config.stopwords);
    this._K1 = config.K1;
    this._b = config.b;

    /** @type {Map<string, TDoc>} */
    this._documents = new Map(documents);
    /** @type {Map<string, number> | null} */
    this._collectionFrequencies = null;
    /** @type {Map<string, number> | null} */
    this._collectionFrequencyWeights = null;
    /** @type {Map<string, Map<string, number>> | null} */
    this._documentVectors = null;
  }

  /**
   * Builds a {@link Corpus} from two parallel lists.  This matches the previous constructor
   * API and is intended to help with migration.
   * 
   * @param {string[]} names
   * An array of document identifiers, having the same number of elements as `texts`.
   * @param {string[]} texts
   * An array of document contents, having the same number of elements as `names`.
   * @param {CorpusOptions} [options]
   * An object to define initialization options.
   * @returns {AnyCorpus}
   */
  static from(names, texts, options) {
    if (names.length !== texts.length) {
      throw new Error('expected `names` to have same length as `texts`');
    }

    /** @returns {Iterable<[string, string]>} */
    function* toKvps() {
      for (let i = 0; i < texts.length; i++)
        yield [names[i], texts[i]];
    }
    // could be seen as redundant, but this makes it so only `fromKvps` needs to be overridden
    // to change what kind of `Document` is used
    return this.fromKvps(toKvps(), options);
  }

  /**
   * Builds a {@link Corpus} from an iterable of key-value-pairs.  If a value in `documentKvps`
   * is a string, it will be converted into a {@link TextDocument}.
   * 
   * @param {Iterable<[string, string | Document]>} documentKvps
   * An iterable of key-value-pairs, an identifier to either a {@link Document} or a string that
   * should be treated as its contents.
   * @param {CorpusOptions} [options]
   * An object to define initialization options.
   * @returns {AnyCorpus}
   */
  static fromKvps(documentKvps, options) {
    /** @returns {Iterable<[string, Document]>} */
    function* toKvps() {
      for (const [id, contents] of documentKvps)
        yield [id, TextDocument.from(contents)];
    }
    return new this(toKvps(), options);
  }

  /**
   * Internal method that determines how many documents in the collection contain each term
   */
  _calculateCollectionFrequencies() {
    this._collectionFrequencies = new Map();
    for (const document of this._documents.values()) {
      document
        .getUniqueTerms()
        .filter(t => !this._stopwords.includes(t))
        .forEach(term => {
          if (this._collectionFrequencies.has(term)) {
            const n = this._collectionFrequencies.get(term);
            this._collectionFrequencies.set(term, n + 1);
          } else {
            this._collectionFrequencies.set(term, 1);
          }
        });
    }
  }

  /**
   * Returns an array containing the unique terms used in the corpus (excluding stopwords)
   * 
   * @returns {string[]}
   */
  getTerms() {
    if (!this._collectionFrequencies) {
      this._calculateCollectionFrequencies();
    }
    return Array.from(this._collectionFrequencies.keys());
  }

  /**
   * Returns the number of documents in the collection that contain the given term
   * 
   * @param {string} term
   * The term to query.
   * @returns {number}
   */
  getCollectionFrequency(term) {
    if (!this._collectionFrequencies) {
      this._calculateCollectionFrequencies();
    }
    const cf = this._collectionFrequencies.get(term);
    return typeof cf !== 'number' ? 0 : cf;
  }

  /**
   * Returns the Document corresponding to the given identifier.
   * 
   * @param {string} identifier
   * The identifier of a document.
   * @returns {TDoc | undefined}
   */
  getDocument(identifier) {
    return this._documents.get(identifier);
  }

  /**
   * Returns an array of all identifiers in the corpus.
   * 
   * @returns {string[]}
   */
  getDocumentIdentifiers() {
    return Array.from(this._documents.keys());
  }

  /**
   * Returns an array of the terms that the documents with these two identifiers have in common;
   * each array entry is a pair of a term and a score, and the array is sorted in descending order
   * by the score, with a maximum length of `maxTerms`.
   * 
   * @param {string} identifier1
   * The first document identifier of the query.
   * @param {string} identifier2
   * The second document identifier of the query.
   * @param {number} [maxTerms]
   * The maximum number of elements to return; defaults to 10.
   * @returns {Array<[string, number]>}
   */
  getCommonTerms(identifier1, identifier2, maxTerms = 10) {
    const vector1 = this.getDocumentVector(identifier1);
    const vector2 = this.getDocumentVector(identifier2);
    const commonTerms = Array.from(vector1.entries())
      .map(
        /** @type {(arg: [string, number]) => [string, number]} */
        ([term, cw]) => [term, cw * vector2.get(term)]
      )
      .filter(d => d[1] > 0);
    return commonTerms.sort((a, b) => b[1] - a[1]).slice(0, maxTerms);
  }

  /**
   * Internal method to calculate collection frequency weight (a.k.a. inverse document frequency).
   * 
   * Compared to the formula in the original paper, we add 1 to N (the number of documents in the
   * collection) so that terms which appear in every document (and are not stopwords) get a very
   * small CFW instead of zero (and therefore, later, get a very small Combined Weight instead of
   * zero, meaning that they can still be retrieved by queries and appear in similarity
   * calculations).
   */
  _calculateCollectionFrequencyWeights() {
    if (!this._collectionFrequencies) {
      this._calculateCollectionFrequencies();
    }
    this._collectionFrequencyWeights = new Map();
    const N = this._documents.size;
    for (const [term, n] of this._collectionFrequencies.entries()) {
      this._collectionFrequencyWeights.set(term, Math.log(N + 1) - Math.log(n));
    }
  }

  /**
   * Returns the collection frequency weight (or inverse document frequency) for the given term.
   * If the term is not found, return `null` explicitly.
   * 
   * @param {string} term
   * The term to query.
   * @returns {number | null}
   */
  getCollectionFrequencyWeight(term) {
    if (!this._collectionFrequencyWeights) {
      this._calculateCollectionFrequencyWeights();
    }
    const cfw = this._collectionFrequencyWeights.get(term);
    return typeof cfw !== 'number' ? null : cfw;
  }

  /**
   * Internal method that creates, for each document, a Map from each term to its corresponding
   * combined (TF-IDF) weight for that document
   */
  _calculateDocumentVectors() {
    if (!this._collectionFrequencyWeights) {
      this._calculateCollectionFrequencyWeights();
    }
    this._documentVectors = new Map();
    const K1 = this._K1;
    const b = this._b;
    // Total length of the collection, calculated here as the sum of all document lengths
    const totalLength = Array.from(this._documents.values())
      .map(d => d.getLength())
      .reduce((a, b) => a + b, 0);
    const avgLength = totalLength / this._documents.size;
    for (const [identifier, document] of this._documents) {
      const vector = new Map();
      const ndl = document.getLength() / avgLength;
      for (const [term, idf] of this._collectionFrequencyWeights.entries()) {
        // Calculate the combined weight (a.k.a. TF-IDF weight) for this term in this document
        const tf = document.getTermFrequency(term);
        const cw = tf ? (idf * tf * (K1 + 1)) / (K1 * (1 - b + b * ndl) + tf) : 0.0;
        vector.set(term, cw);
      }
      this._documentVectors.set(identifier, vector);
    }
  }

  /**
   * Returns a `Map` from terms to their corresponding combined (TF-IDF) weights, for the
   * document with the given identifier.
   * 
   * @param {string} identifier
   * The identifier of a document.
   * @returns {Map<string, number> | undefined}
   */
  getDocumentVector(identifier) {
    if (!this._documentVectors) {
      this._calculateDocumentVectors();
    }
    return this._documentVectors.get(identifier);
  }

  /**
   * Returns an array containing the terms with the highest combined (TF-IDF) weights for the
   * document with the given identifier; each array entry is a pair of a term and a weight, and
   * the array is sorted in descending order by the weight, with a maximum length of "maxTerms"
   * 
   * @param {string} identifier
   * The identifier of a document.
   * @param {number} [maxTerms]
   * The maximum number of elements to return; defaults to 30.
   * @returns {Array<[string, number]>}
   */
  getTopTermsForDocument(identifier, maxTerms = 30) {
    const vector = this.getDocumentVector(identifier);
    if (!vector) return [];
    const sortedTerms = Array.from(vector.entries())
      .filter(d => d[1] > 0.0)
      .sort((a, b) => b[1] - a[1]); // descending order
    return sortedTerms.slice(0, maxTerms);
  }

  /**
   * Internal method to convert a query into a list of unique terms.
   * 
   * @param {any} query
   * Something that represents a query.
   * @returns {string[]}
   */
  _queryToUniqueTerms(query) {
    // This basic implementation only works with string queries.
    if (typeof query === 'string' && query.length > 0) {
      return new TextDocument(query).getUniqueTerms();
    }
    return [];
  }

  /**
   * Returns an array representing the highest scoring documents for the given query; each array
   * entry is a pair of a document identifier and a score, and the array is sorted in descending
   * order by the score. The score for a document is the total combined weight of each query term
   * that appears in the document.
   * 
   * @param {string} query
   * A string containing space-separated terms to query for.
   * @returns {Array<[string, number]>}
   */
  getResultsForQuery(query) {
    const terms = this._queryToUniqueTerms(query);
    if (terms.length === 0) return [];

    const scores = this.getDocumentIdentifiers().map(
      /** @type {(d: string) => [string, number]} */
      (d) => {
        const vector = this.getDocumentVector(d);
        let score = 0.0;
        terms.forEach(t => {
          const weight = vector.get(t);
          if (weight) {
            score += weight;
          }
        });
        return [d, score];
      }
    );
    return scores.filter(d => d[1] > 0).sort((a, b) => b[1] - a[1]);
  }

  /**
   * Returns the Stopwords instance that is being used by this corpus (for inspection or debugging).
   * 
   * @returns {Stopwords}
   */
  getStopwords() {
    return this._stopwords;
  }
}

/**
 * An exported type for a {@link Corpus} of any kind of {@link Document}.
 * 
 * @typedef {Corpus<Document>} AnyCorpus
 */
