# dataset-utils
`@openactive/dataset-utils` is a Node.js utility library designed to simplify the handling of OpenActive data catalogs and dataset sites. The library facilitates fetching, parsing, and manipulating data from various dataset URLs within a specified catalog, ensuring a seamless interaction with OpenActive data.

## Features

- **Recursive Data Catalog Crawling**: Methodically navigates through data catalogs, fetches datasets, and extracts JSON-LD from dataset HTML.
- **Data URL Retrieval**: Efficiently retrieves an array of dataset site URLs from data catalogs and part collections.
- **Metadata Extraction**: Extracts JSON-LD metadata from HTML dataset pages.

## Installation

Install the package via npm:

```sh
npm install @openactive/dataset-utils
```
## Usage


### `getAllDatasetSiteUrls(dataCatalogUrl)`

#### Description
This is a recursive function that returns an array of dataset site URLs.
If the URL supplied is a data catalog collection, it gets all the data catalogs in `hasPart` and crawls them.
If the URL supplied is a data catalog, it gets the `dataset` array and flattens it. 

#### Parameters
- `dataCatalogUrl` (optional): A custom data catalog URL. Defaults to the [OpenActive Data Catalog](https://openactive.io/data-catalogs/data-catalog-collection.jsonld).

#### Returns
- `Promise<{urls: string[], errors: object[]}>`: The function returns a promise that resolves with an object containing two properties:
  - `urls` - An array of strings, each being a URL for a dataset.
  - `errors` - An array of error objects, each containing details about errors encountered during the retrieval process. If no errors were encountered, this array is empty. Each error object includes:
    - `url`: The URL from which data was being fetched when the error occurred.
    - `status`: HTTP status code of the error response (if available).
    - `message`: A descriptive message detailing the nature of the error.

#### Example
```javascript
const { getAllDatasetSiteUrls } = require('@openactive/dataset-utils');

const { urls, errors } = await getAllDatasetSiteUrls();

console.log(`Retrieved ${urls.length} dataset URLs`);
if (errors.length > 0) {
  console.error(`${errors.length} errors encountered during retrieval:`);
  errors.forEach(error => {
    console.error(`- [${error.status}] ${error.url}: ${error.message}`);
  });
}

```


### `extractJSONLDfromHTML(url, html)`

This function extracts JSON-LD metadata from a given Dataset Site `html`, using the provided `url` to resolve relative URLs within the JSON-LD.

Note that relative URLs are not generally permissible within OpenActive data, however the underlying JSON-LD library still requires that this be specified.

#### Parameters:
- `url`: The URL used to resolve relative URLs in the HTML page.
- `html`: HTML content from which JSON-LD data will be extracted.

#### Returns:
An object representing the extracted JSON-LD, or `null` if extraction fails.

#### Example:
```js
const { extractJSONLDfromHTML } = require('@openactive/dataset-utils');

const jsonld = extractJSONLDfromHTML('https://example.com/dataset', '<html>...</html>');
console.log(jsonld);
```


### `getAllDatasets([dataCatalogUrl])`

This function recursively crawls through a data catalog, fetches datasets, and extracts JSONLD from the dataset HTML. This combines `getAllDatasetSiteUrls()` and `extractJSONLDfromHTML()`.

The `errors` array it returns will detail any issues that occurred during the process of fetching and extracting data from URLs. This can be large in number due to the fractured nature of maintainence of OpenActive feeds.


#### Parameters:
- `dataCatalogUrl` (optional): A custom data catalog URL. Defaults to the [OpenActive Data Catalog](https://openactive.io/data-catalogs/data-catalog-collection.jsonld).

#### Returns:
A `Promise` that resolves with an object containing:
  - `jsonld`: An array of extracted JSON-LD objects from the datasets.
  - `errors`: An array of error objects indicating any issues encountered during fetching. Each error object includes:
    - `url`: The URL from which data was being fetched when the error occurred.
    - `status`: HTTP status code of the error response (if available).
    - `message`: A descriptive message detailing the nature of the error.

#### Example:
```js
const { getAllDatasets } = require('@openactive/dataset-utils');

getAllDatasets().then(({ jsonld, errors }) => {
  console.log(jsonld);
  
  // Iterating through the errors
  errors.forEach(error => {
    console.log(`Error fetching URL: ${error.url}`);
    console.log(`HTTP Status Code: ${error.status}`);
    console.log(`Message: ${error.message}`);
  });
});
```

## Testing

Execute test cases using:

```sh
npm test
```

The test suite, located in `./test/getAllDatasets-test.js`, utilises mocks to simulate various use cases.

## Contributions
We welcome your contributions! Feel free to submit a pull request.
