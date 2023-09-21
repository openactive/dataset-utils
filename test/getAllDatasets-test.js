const { expect } = require('chai');
const { default: axios } = require('axios');
const fs = require('fs').promises;
const { getAllDatasets } = require('../index');
const dataCatalogCollection = require('./mockData/dataCatalogCollection');
const singularDataCatalog = require('./mockData/singularDataCatalog');

// Mock jest
jest.mock('axios');

// Note: This test tests getAllDatasets and therefore implicitly tests getAllDatasetSiteUrls and extractJSONLDfromHTML.
// In future, tests should test all public functions individually.
describe('getAllDatasets()', function () {
  it('should return all datasets', async () => {
    // Test Objects
    const exampleDatasetSiteBuffer = await fs.readFile('./test/mockData/exampleDatasetSite.html');
    const exampleDatasetSite = exampleDatasetSiteBuffer.toString();

    // Mock
    axios.get.mockImplementation((url) => {
      if (url === 'https://openactive.io/data-catalogs/example-data-catalog-collection.jsonld') { return Promise.resolve({ data: dataCatalogCollection }); }
      if (url === 'https://openactive.io/data-catalogs/singular.jsonld') { return Promise.resolve({ data: singularDataCatalog }); }
      if (url === 'https://openactive.io/dataset-site-template/Openactive') { return Promise.resolve({ data: exampleDatasetSite }); }
      return Promise.reject(new Error('Not found'));
    });

    // Test
    const { jsonld: datasets } = await getAllDatasets('https://openactive.io/data-catalogs/example-data-catalog-collection.jsonld');

    // Assertions
    expect(datasets).to.be.an('array');
    expect(datasets.length).to.be.above(0);
    expect(datasets[0]).to.be.an('object');
    expect(datasets[0]['@type']).to.equal('Dataset');
    expect(datasets[0]['@id']).to.be.an('string');
  }, 30000);
});
