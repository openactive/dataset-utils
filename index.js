const { default: axios } = require('axios');
const { Handler } = require('htmlmetaparser');
const { Parser } = require('htmlparser2');

/**
 * This is a recursive function that returns an array of dataset site URLs.
 * If the URL supplied is a data catalog collection, it takes all the part collections in hasPart and crawls them.
 * If the URL supplied is a data catalog, it takes the dataset array and flattens them. 
 * If the URL is not supplied, the OA Data Catalog (https://openactive.io/data-catalogs/data-catalog-collection.jsonld) is used.
 * 
 * @param {string} [dataCatalogUrl]
 * @returns {Promise<string[]>}
 */
async function getAllDatasetSiteUrls(dataCatalogUrl = 'https://openactive.io/data-catalogs/data-catalog-collection.jsonld') {
  let catalog;
  try {
    catalog = (await axios.get(dataCatalogUrl, {timeout: 5000})).data;
  } catch (error) {
    console.error(`Error getting catalog or catalog collection, url: ${dataCatalogUrl}`)
    return [];
  }

  // If catalog has hasPart, the part catalog must be fetched and the datasets got from the part catalog
  // The part catalog could have a part catalog within in, which is why this function must be recursive.
  if (catalog.hasPart) {
    const datasetArray = await Promise.all(catalog.hasPart.map(partCatalogUrl => getAllDatasetSiteUrls(partCatalogUrl)));
    return [].concat(...datasetArray);
  }

  // If the catalog has dataset, it does not have any further part catalogs and the datasets can be got from them
  if (catalog.dataset) {
    return catalog.dataset;
  }

  // If the catalog has neither hasPart or dataset, return [] as it does not have the information we want
  return [];
}

/**
 * This function extracts JSONLD metadata from dataset HTML
 * 
 * @param {string} url 
 * @param {string} html 
 */
function extractJSONLDfromHTML(html) {
  let jsonld = null;

  const handler = new Handler(
    (err, result) => {
      if (!err && typeof result === 'object') {
        const jsonldArray = result.jsonld;
        // Use the first JSON-LD block on the page
        if (Array.isArray(jsonldArray) && jsonldArray.length > 0) {
          [jsonld] = jsonldArray;
        }
      }
    },
  );

  // Create a HTML parser with the handler.
  const parser = new Parser(handler, {
    decodeEntities: true,
  });
  parser.write(html);
  parser.done();

  return jsonld;
}

/**
 * This function recursively crawls through a data catalog, fetches datasets, and extracts JSONLD
 * from dataset HTML.
 * This combines getAllDatasetSiteUrls() and extractJSONLDfromHTML().
 * If dataCatalogUrl is not supplied, the default OA Data Catalog (https://openactive.io/data-catalogs/data-catalog-collection.jsonld) is used.
 * 
 * @param {string} [dataCatalogUrl]
 */
async function getAllDatasets(dataCatalogUrl = 'https://openactive.io/data-catalogs/data-catalog-collection.jsonld') {
  // Get Dataset URLs
  const datasetUrls = await getAllDatasetSiteUrls(dataCatalogUrl);

  const jsonldFromDatasetUrls = (await Promise.all(datasetUrls.map(async (datasetUrl) => {
    let dataset;
    try {
      // Get JSONLD from dataset URLs
      dataset = (await axios.get(datasetUrl)).data;
    } catch (error) {
      console.error(`getAllDatasets() - ${datasetUrl} could not be fetched`);
      return null;
    }

    const jsonld = extractJSONLDfromHTML(dataset);
    return jsonld;
  })))
    // Filter out datasets that do not have valid dataset
    .filter((x) => !!x);

  return jsonldFromDatasetUrls;
}

module.exports = {
  getAllDatasetSiteUrls,
  extractJSONLDfromHTML,
  getAllDatasets
};