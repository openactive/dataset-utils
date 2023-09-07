const { expect } = require('chai');
const { getAllDatasets } = require('../index');

// Note: This test tests getAllDatasets and therefore implicitly tests getAllDatasetSiteUrls and extractJSONLDfromHTML.
// In future, tests should test all public functions individually.
describe('getAllDatasets()', function () {
  it('should return all datasets', async () => {
    const datasets = await getAllDatasets('https://openactive.io/data-catalogs/data-catalog-collection.jsonld', true);
    expect(datasets).to.be.an('array');
    expect(datasets.length).to.be.above(0);
    expect(datasets[0]).to.be.an('object');
    expect(datasets[0]['@type']).to.equal('Dataset');
    expect(datasets[0]['@id']).to.be.an('string');
  }, 30000);
});
