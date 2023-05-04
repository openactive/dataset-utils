const { default: axios } = require('axios');

/**
 * This is a recursive function that returns an array of dataset site URLs.
 * If the URL supplied is a data catalog collection, it takes all the part collections in hasPart and crawls them.
 * If the URL supplied is a data catalog, it takes the dataset array and flattens them. 
 * 
 * @param {string} dataCatalogUrl
 * @returns {Promise<string[]>}
 */
async function recursivelyGetCatalogsToGetDatasetUrls(dataCatalogUrl) {
  let catalog;
  try {
    catalog = (await axios.get(dataCatalogUrl, {timeout: 5000})).data;
  } catch (error) {
    console.error(`Error getting catalog or catalog collection, url: ${dataCatalogUrl}`)
  }

  // If catalog has hasPart, the part catalog must be fetched and the datasets got from the part catalog
  // The part catalog could have a part catalog within in, which is why this function must be recursive.
  if (catalog.hasPart) {
    const datasetArray = await Promise.all(catalog.hasPart.map(partCatalogUrl => recursivelyGetCatalogsToGetDatasetUrls(partCatalogUrl)));
    return [].concat(...datasetArray);
  }

  // If the catalog has dataset, it does not have ant further part catalogs and the datasets can be got from them
  if (catalog.dataset) {
    return catalog.dataset;
  }

  // If the catalog has neither hasPart or dataset, return [] as it does not have the information we want
  return [];
}

module.exports = recursivelyGetCatalogsToGetDatasetUrls;