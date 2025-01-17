import { Corpus, Document, TextDocument, Similarity, Stopwords, defaultStopwords } from './index.js';
import tape from 'tape';

const docsByKvp = new Map([
  ['document1', 'This is test document number 1. It is quite a short document.'],
  ['document2', 'This is test document 2. It is also quite short, and is a test.'],
  ['document3', 'Test document number three is a bit different and is also a tiny bit longer.']
]);
const commonOptions = { stopwords: defaultStopwords };

tape('Unit tests for Corpus builder methods', function (t) {
  t.plan(5);

  // from KVPs
  const goodKvps = () => Corpus.fromKvps(docsByKvp, commonOptions);
  t.doesNotThrow(goodKvps);
  t.equal(goodKvps().getDocumentIdentifiers().length, 3);

  // from parallel arrays
  const goodPairedArrs = () => {
    const names = [...docsByKvp.keys()];
    const texts = [...docsByKvp.values()];
    return Corpus.from(names, texts, commonOptions);
  };
  t.doesNotThrow(goodPairedArrs);
  t.equal(goodPairedArrs().getDocumentIdentifiers().length, 3);

  // an explicit throw when `names.length` is not `texts.length`
  const badPairedArrs = () => {
    const names = [...docsByKvp.keys()].slice(1);
    const texts = [...docsByKvp.values()];
    return Corpus.from(names, texts, commonOptions);
  };
  t.throws(badPairedArrs);
});

tape('Unit tests for Corpus class', function (t) {
  t.plan(18);

  const corpus = Corpus.fromKvps(docsByKvp, commonOptions);
  t.equal(corpus.getDocumentIdentifiers().length, 3);

  const terms = corpus.getTerms();
  t.ok(terms.includes('test'));
  t.ok(terms.includes('short'));
  t.notOk(terms.includes('1')); // number
  t.notOk(terms.includes('a')); // too short
  t.notOk(terms.includes('and')); // stopword

  t.equal(corpus.getCollectionFrequency('test'), 3);
  t.equal(corpus.getCollectionFrequency('short'), 2);
  t.equal(corpus.getCollectionFrequency('and'), 0); // stopword

  // 'quite' and 'short' should be the top two common terms for documents 1 & 2, because they
  // appear in both documents and not in document 3
  const topTwo = corpus.getCommonTerms('document1', 'document2').map(d => d[0]).slice(0, 2).sort();
  t.ok(topTwo[0] === 'quite' && topTwo[1] === 'short');

  // 'test' should have a lower weight than 'short' because it appears in more documents
  const testWeight = corpus.getCollectionFrequencyWeight('test');
  const shortWeight = corpus.getCollectionFrequencyWeight('short');
  t.ok(testWeight < shortWeight);

  // 'and', a stopword, can not have a weight
  t.equal(corpus.getCollectionFrequencyWeight('and'), null);

  const topTerms = corpus.getTopTermsForDocument('document3');
  // Terms after stopword filtering: ['test', 'document', 'number', 'three', 'bit', 'different',
  // 'also', 'tiny', 'longer']
  t.equal(topTerms.length, 9);
  // 'bit' should have the highest weight, because it appears twice in document 3 and only there
  t.equal(topTerms[0][0], 'bit');

  const queryResults = corpus.getResultsForQuery('a bit of a test query');
  // All documents should match this query (because of the term 'test')
  t.equal(queryResults.length, 3);
  // Document 3 should be the highest ranked (because of the term 'bit')
  t.equal(queryResults[0][0], 'document3');
  // We should guard against a query that is empty or is not a string
  t.equal(corpus.getResultsForQuery('').length, 0);
  t.equal(corpus.getResultsForQuery(2).length, 0);
});

tape('Unit tests for TextDocument class', function (t) {
  t.plan(6);
  const textDoc = TextDocument.from(docsByKvp.get('document3'));

  // builder should return instance when already a `Document`.
  const baseDoc = new Document(['the', 'quick', 'brown', 'fox']);
  t.equal(baseDoc, TextDocument.from(baseDoc));
  t.equal(textDoc, TextDocument.from(textDoc));

  const terms = textDoc.getUniqueTerms();
  // We have ignored short terms (<2 characters) and stripped numbers, and have not yet applied
  // stopword filtering. So unique terms are ['test', 'document', 'number', 'three', 'is', 'bit',
  // 'different', 'and', 'also', 'tiny', 'longer']
  t.equal(terms.length, 11);

  t.equal(textDoc.getTermFrequency('bit'), 2);
  t.equal(textDoc.getTermFrequency('and'), 1); // stopwords are still present at the document level
  t.equal(textDoc.getTermFrequency('a'), 0); // too short
});

tape('Unit tests for Similarity class', function (t) {
  t.plan(2);
  const similarity = new Similarity(Corpus.fromKvps(docsByKvp, commonOptions));
  const distanceMatrix = similarity.getDistanceMatrix();
  t.equal(distanceMatrix.identifiers.length, 3);
  // The first two documents should be more similar to each other (i.e. less distant) than the
  // first and third.
  t.ok(distanceMatrix.matrix[0][1] < distanceMatrix.matrix[0][2]);
});

tape('Unit tests for Stopwords class', function (t) {
  t.plan(9);
  const customStopwords = ['test', 'words'];

  const customStopwordsOnly = new Stopwords(customStopwords);
  t.ok(customStopwordsOnly.includes('test'));
  t.ok(customStopwordsOnly.includes('words'));
  t.notOk(customStopwordsOnly.includes('the'));

  const emptyStopwords = new Stopwords([]);
  t.notOk(emptyStopwords.includes('test'));
  t.notOk(emptyStopwords.includes('words'));
  t.notOk(emptyStopwords.includes('the'));

  const defaultPlusCustomStopwords = defaultStopwords.with(customStopwords);
  t.ok(defaultPlusCustomStopwords.includes('test'));
  t.ok(defaultPlusCustomStopwords.includes('words'));
  t.ok(defaultPlusCustomStopwords.includes('the'));
});
