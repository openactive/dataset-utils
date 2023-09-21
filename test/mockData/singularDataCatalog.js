const singularDataCatalog = {
  '@context': 'https://schema.org/',
  '@type': 'DataCatalog',
  '@id': 'https://openactive.io/data-catalogs/singular.jsonld',
  name: 'Singular datasets that are not included in other data catalogs',
  datePublished: '2020-02-20T08:55:19+00:00',
  license: 'https://creativecommons.org/licenses/by/4.0/',
  publisher: {
    '@type': 'Organization',
    name: 'OpenActive',
    url: 'https://www.openactive.io/',
  },
  dataset: [
    'https://openactive.io/dataset-site-template/Openactive',
  ],
};

module.exports = singularDataCatalog;
