# tiny-tfidf
![npm](https://img.shields.io/npm/v/tiny-tfidf.svg)

Minimal implementations of a couple of classic text analysis tools (TF-IDF and cosine similarity). Everything is done in memory so this library is not suitable for large-scale use. Instead, the goal is to create something simple that can be used to explain or experiment with the techniques, using a small set of documents. For a detailed and interactive explanation, see this [Observable notebook](https://observablehq.com/@kerryrodden/introduction-to-text-analysis-with-tf-idf).

The term weighting scheme is BM25, as described in this [technical report](https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-356.pdf) by Stephen Robertson and Karen Spärck Jones.

A basic set of English stopwords is included, and you can specify your own list of stopwords to add. In the interest of keeping this "tiny" (and fast enough to run in the browser) there are some useful things that I didn't implement, most notably:
- phrases (bigrams, trigrams, etc), e.g. "proof of concept"
- stemming or lemmatizing, e.g. reducing "concept" and "concepts" to the same root

I am open to adding either if there's a tiny way to do it!

## Usage

Note: I'm still actively developing this code (and documentation), and the API is likely to change/evolve up until version 1.0.

```js
import { Corpus, defaultStopwords as stopwords } from "tiny-tfidf";

const corpus = Corpus.from(
  ["document1", "document2", "document3"],
  [
    "This is test document number 1. It is quite a short document.",
    "This is test document 2. It is also quite short, and is a test.",
    "Test document number three is a bit different and is also a tiny bit longer."
  ],
  { stopwords }
);

// print top terms for document 3
console.log(corpus.getTopTermsForDocument("document3"));

// result
[
  [ 'bit', 1.9939850399669656 ],
  [ 'three', 1.3113595307890855 ],
  [ 'different', 1.3113595307890855 ],
  [ 'tiny', 1.3113595307890855 ],
  [ 'longer', 1.3113595307890855 ],
  [ 'number', 0.6556797653945428 ],
  [ 'also', 0.6556797653945428 ],
  [ 'test', 0.2721316901570901 ],
  [ 'document', 0.2721316901570901 ]
]
```

For many more usage examples, see this [Observable notebook](https://observablehq.com/@kerryrodden/introduction-to-text-analysis-with-tf-idf).

### With Node.js

Disclaimer: this is an ES6 module and is mostly intended for use in the browser, rather than with Node.js ([more background on ES6 modules and Node](https://github.com/nodejs/modules/blob/master/doc/announcement.md#es-module-code-in-packages)).

Example with Node v12.6.0 :

```sh
node --experimental-modules --es-module-specifier-resolution=node test.js
```
## API (v0.9)

### `Corpus` class

This is the main class that you will use directly. It manages the `Stopwords` and a collection of `Documents`, calculating term frequencies, term weights, and term vectors, and can return results for a given query.
- `constructor(documents, options = { stopwords = [], K1 = 2.0, b = 0.75 })`:
  - `documents` is an iterable of key-value-pairs (a tuple of `[string, Document]`), where the key is the document identifier and the value is a `Document` instance
  - `options.stopwords` is a `Stopwords` instance or array of strings with terms to exclude
  - `options.K1` and `options.b` are tuning parameters for term weighting that are explained in the reference [technical report](https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-356.pdf)
- `static from(names, texts, options)` builds a `Corpus` from parallel arrays containing the document identifiers in `names` and the full `texts` of each document; `options` corresponds to the same argument in the constructor
- `static fromKvps(kvps, options)` builds a `Corpus` from any iterable of key-value-pairs (a tuple of `[string, string]`) where the key is the document identifier and the value is its text; `options` corresponds to the same argument in the constructor
- `getTerms()`: returns an array containing the unique terms used in the corpus (excluding stopwords)
- `getCollectionFrequency(term)`: returns the number of documents in the collection that contain the given term
- `getDocument(identifier)`: returns the `Document` object for the given `identifier`
- `getDocumentIdentifiers()`: returns an array of all identifiers in the corpus
- `getCommonTerms(identifier1, identifier2, maxTerms = 10)`: returns an array of the terms that the documents with these two identifiers have in common; each array entry is a pair of a term and a score, and the array is sorted in descending order by the score, with a maximum length of `maxTerms` (which is optional and defaults to 10)
- `getCollectionFrequencyWeight(term)`: returns the collection frequency weight (or inverse document frequency) for the given `term`; will return `null` if the term is not in any document
- `getDocumentVector(identifier)`: returns a `Map` from terms to their corresponding combined (TF-IDF) weights, for the document with the given `identifier` (this is used by the `Similarity` class)
- `getTopTermsForDocument(identifier, maxTerms = 30)`: returns an array containing the terms with the highest combined (TF-IDF) weights for the document with the given `identifier`; each array entry is a pair of a term and a weight, and the array is sorted in descending order by the weight, with a maximum length of `maxTerms` (which is optional and defaults to 30)
- `getResultsForQuery(query)`: returns an array representing the highest scoring documents for the given `query`; each array entry is a pair of a document identifier and a score, and the array is sorted in descending order by the score. The score for a document is the total combined weight of each query term that appears in the document.
- `getStopwords()`: returns the `Stopwords` instance that is being used by this corpus (for inspection or debugging)

The other methods in the class (whose names start with `_calculate`) are intended for internal use.

### `Document` class

This is used by the `Corpus` class to maintain the document-level term frequencies for each document; it is independent of any stopword list or term weights (which are managed at the corpus level).
- `constructor(words)`: expects a list of individual words that represent the document
- `getTermFrequency(term)`: returns a count of how often the given term appears in this document
- `getLength()`: returns the total number of terms in the document (including stopwords)
- `getUniqueTerms()`: returns an array of the unique terms that appear in the document (including stopwords)

The other method, `_calculateTermFrequencies`, is intended for internal use.

You can sub-class `Document` to specialize it. Simply provide instances of the sub-class directly to the `Corpus` constructor if you need a document that has different behavior or additional features.

### `TextDocument` class

This is used by the `Corpus` class as the default for its `from` and `fromKvps` static methods. It takes a basic string and extracts individual words from it.
- `constructor(text)`: expects a single one of the texts originally passed into `Corpus`
- `static from(textOrDocument)`: converts `textOrDocument` into a `Document` instance, only invoking the constructor with the given value when it is not a `Document` instance
- `getText()`: returns a string containing the full text of this document (e.g. for display)
- ...and all methods of `Document`.

This implementation only considers terms that contain only letters or numbers; they are filtered out if they contain only 1 character or if they start with a number.

### `Stopwords` class
A wrapper around an ES6 `Set` that stores stopwords.
- `constructor(terms = [])`: `terms` is an array containing the terms to use for the list.
- `static from(stopwordsOrTerms = [])`: converts `stopwordsOrTerms` into an instance of `Stopwords`, only invoking the constructor with the given value when it is not a `Stopwords` instance
- `with(additionalStopwords)`: creates a new `Stopwords` instance that includes additional stopwords
- `includes(term)`: returns `true` if the current stopword list contains the given `term`, or `false` otherwise
- `getStopwordList()`: returns an array of the stopword list currently in use (for inspection or debugging)

A built-in set of stopwords are provided by importing `defaultStopwords`.  You can also add words to it using `with`:
```js
import { Corpus, defaultStopwords } from "tiny-tfidf";

const names = [/* List of documents identifiers. */];
const texts = [/* List of document contents. */];
const corpus = Corpus.from(names, texts, {
  stopwords: defaultStopwords.with([
    "my", "extra", "stopwords"
  ])
});
```

If you use a different set of stopwords or do not wish to use stopwords, the built-in defaults can be tree-shaken from a client-side deliverable with Webpack or other similar build tool to reduce the size; just avoid importing `defaultStopwords`.

### `Similarity` class

An optional addition: once you have a `Corpus` you can use `Similarity` to calculate the pairwise similarity between the documents in the corpus, resulting in a distance matrix (distance = 1 - similarity).
- `constructor(corpus)`: expects an instance of `Corpus`
- `static cosineSimilarity(vector1, vector2)`: calculates the similarity between a pair of documents (as [the cosine of the angle between their vectors](https://en.wikipedia.org/wiki/Cosine_similarity)). Each vector is represented as an ES6 `Map` from each term to its combined (TF-IDF) weight for the corresponding document. It is currently only used to calculate individual entries in the distance matrix.
- `getDistanceMatrix()`: returns an object with properties `identifiers` (an array of identifiers for the items in the matrix) and `matrix` (an array of arrays, where the values represent distances between items; distance is 1.0 - similarity, so 0 = identical)

The other method, `_calculateDistanceMatrix`, is intended for internal use.
