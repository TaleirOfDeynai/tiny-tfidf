import Document from "./Document";

// This is used by the Corpus class for each of the given texts. It is independent of any stopword
// list or term weights (which are managed at the corpus level) and only maintains the
// document-level term frequencies. Terms can contain only letters or numbers; they are filtered
// out if they contain only 1 character or if they start with a number.
export default class TextDocument extends Document {

  /**
   * @param {string} text
   * Expects a single one of the texts originally passed into Corpus
   */
  constructor(text) {
    const words = text
      .match(/[a-zA-ZÀ-ÖØ-öø-ÿ]+/g)
      .filter(word => {
        // Exclude very short terms and terms that start with a number
        // (stopwords are dealt with by the Corpus class)
        if (word.length < 2 || word.match(/^\d/)) {
          return false;
        } else {
          return true;
        }
      })
      .map(word => word.toLowerCase());
  
    super(words);
    this._text = text;
  }

  /**
   * Converts the given value into a {@link Document} instance, only invoking the constructor
   * when it is not an instance.
   * 
   * @param {string | Document} textOrDocument
   * A {@link Document} instance or a string to build one from.
   * @returns {Document}
   */
  static from(textOrDocument) {
    return textOrDocument instanceof Document ? textOrDocument : new this(textOrDocument);
  }

  /**
   * Returns a string containing the full text of this document (e.g. for display).
   * 
   * @returns {string}
   */
  getText() {
    return this._text;
  }
}
