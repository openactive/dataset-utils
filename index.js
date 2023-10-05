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
 * @returns {Promise<{urls: string[], errors: object[]}>}
 */
async function getAllDatasetSiteUrls(dataCatalogUrl = 'https://openactive.io/data-catalogs/data-catalog-collection.jsonld') {
  let catalog;
  const errors = [];

  try {
    catalog = (await axios.get(dataCatalogUrl, { timeout: 5000 })).data;
  } catch (error) {
    errors.push({
      url: dataCatalogUrl,
      status: error.response?.status,
      message: error.message,
    });
    return { urls: [], errors };
  }

  // If catalog has `hasPart` it is a collection, so the data catalogs must be fetched and the `dataset`s retrieved from the data catalogs
  // The catalog collection could have a catalog collection within in, which is why this function must be recursive.
  if (catalog.hasPart) {
    const datasetArraysAndErrors = await Promise.all(catalog.hasPart.map(partCatalogUrl => getAllDatasetSiteUrls(partCatalogUrl)));
    
    // Concatenate all dataset URLs and errors.
    const allUrls = [].concat(...datasetArraysAndErrors.map(data => data.urls));
    const allErrors = [].concat(...datasetArraysAndErrors.map(data => data.errors));
    
    return { urls: allUrls, errors: allErrors };
  }

  // If the catalog has `dataset`, it does not have any further part catalogs and the datasets can be got from them
  if (catalog.dataset) {
    return { urls: catalog.dataset, errors: [] };
  }

  // If the catalog has neither `hasPart` or `dataset`, return [] as it does not have the information we want
  return { urls: [], errors };
}

/**
 * This function extracts JSONLD metadata from dataset HTML
 *
 * @param {string} url
 * @param {string} html
 */
function extractJSONLDfromHTML(url, html) {
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
    {
      url, // The HTML pages URL is used to resolve relative URLs.
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
 * @returns {Promise<{jsonld: Record<string,any>[], errors: string[]}>}
 *
 */
async function getAllDatasets(dataCatalogUrl = 'https://openactive.io/data-catalogs/data-catalog-collection.jsonld') {
  // Get Dataset URLs
  const datasetUrls = await getAllDatasetSiteUrls(dataCatalogUrl);

  const errors = [];
  const jsonldFromDatasetUrls = (await Promise.all(datasetUrls.map(async (datasetUrl) => {
    let dataset;
    try {
      // Get JSONLD from dataset URLs
      dataset = (await axios.get(datasetUrl)).data;
    } catch (error) {
      errors.push({
        url: datasetUrl,
        status: error.response?.status,
        message: error.message,
      });
      return null;
    }

    const jsonld = extractJSONLDfromHTML(datasetUrl, dataset);
    return jsonld;
  })))
    // Filter out datasets that do not have valid dataset
    .filter(x => !!x);

  return { jsonld: jsonldFromDatasetUrls, errors };
}

module.exports = {
  getAllDatasetSiteUrls,
  extractJSONLDfromHTML,
  getAllDatasets,
};
