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
  const { urls: datasetUrls, errors } = await getAllDatasetSiteUrls(dataCatalogUrl);

  const jsonldFromDatasetUrls = (await Promise.all(datasetUrls.map(async (datasetUrl) => {
    let dataset;
    try {
      // Get JSONLD from dataset URLs
      dataset = (await axiosGetWithRetryForKnownLegendIssue(datasetUrl)).data;
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

/**
 * Validates JSON-LD content by ensuring the '@id' or 'id' field matches the provided ID.
 *
 * This function performs an HTTP GET request to the specified ID (URL), retrieves
 * the response, and extracts JSON-LD from it if needed and possible. It then compares
 * the '@id' or 'id' field from the retrieved JSON-LD to the provided ID.
 *
 * Note that this is only applicable to JSON-LD "@id" for the DataCatalog and Dataset types, which must resolve.
 *
 * @async
 * @param {string} id - The expected '@id' or 'id' value, also the URL to be requested.
 * @param {boolean} expectHtml - A flag indicating whether the response is expected to be HTML (i.e. a Dataset Site).
 * @returns {Promise<{isValid: boolean, error: string|null}>} - An object indicating the validity
 * of the JSON-LD and any associated error message.
 *
 * @example
 * validateJsonLdId('https://example.com/data.jsonld', false)
 *   .then(({isValid, error}) => {
 *     if (isValid) {
 *       console.log('JSON-LD is valid!');
 *     } else {
 *       console.error(`JSON-LD validation failed: ${error}`);
 *     }
 *   });
 */
async function validateJsonLdId(id, expectHtml) {
  let response;

  try {
    response = await axiosGetWithRetryForKnownLegendIssue(id);
    response = response.data;
  } catch (error) {
    return { isValid: false, error: `Failed to resolve URL: ${error.message}` };
  }

  let jsonLd;
  try {
    if (expectHtml && typeof response === 'string') {
      jsonLd = extractJSONLDfromHTML(id, response);
    } else if (!expectHtml && typeof response === 'object') {
      jsonLd = response;
    } else {
      return { isValid: false, error: `Unexpected response type: ${typeof response}` };
    }

    const jsonId = jsonLd['@id'] || jsonLd.id;
    if (jsonId !== id) {
      return { isValid: false, error: `Mismatched '@id': From file: "${id}"; From referenced JSON-LD: "${jsonId}"` };
    }
  } catch (error) {
    return { isValid: false, error: error.message };
  }

  return { isValid: true, error: null };
}

/*
* System-specific workaround: Note that rate limits in Legend can cause this request to fail with a 403 (?), so we retry up to 5 times
* TODO: Ask Legend to return a 429 instead
*/
async function axiosGetWithRetryForKnownLegendIssue(url) {
  let response;
  const maxRetries = 5; // Define a maximum number of retries

  async function sleep(milliseconds) {
    return new Promise((resolve) => { setTimeout(resolve, milliseconds); });
  }

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      response = await axios.get(url);
      break; // Exit the loop if the request was successful
    } catch (error) {
      if (error.response && error.response.status === 403 && attempt < maxRetries - 1) {
        // Log a warning and retry after sleeping for a random duration between 1 and 3 seconds
        // A random duration is used to avoid clients retrying at the same time and causing a thundering herd,
        // particularly when a single service is serving multiple datasets.
        console.warn(`Attempt ${attempt + 1}: Access forbidden (403) for URL: ${url}. Retrying...`);
        await sleep(1000 + Math.random() * 2000); // Sleep for 1 to 3 seconds
      } else {
        throw error;
      }
    }
  }
  return response;
}

module.exports = {
  getAllDatasetSiteUrls,
  extractJSONLDfromHTML,
  getAllDatasets,
  validateJsonLdId,
};
