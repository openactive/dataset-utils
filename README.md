# data-catalog-crawler
Crawls OpenActive data-catalogs and returns an array of dataset sites

## Install

```
$ npm install @openactive/data-catalog-crawler --save
```

## Dependencies
- [Axios](https://github.com/axios/axios)

## Usage

```js
const recursivelyGetCatalogsToGetDatasetUrls = require('@openactive/data-catalog-crawler');
const EXAMPLE_DATA_CATALOG_COLLECTION = 'https://openactive.io/data-catalogs/data-catalog-collection.jsonld';

var datasetUrls = recursivelyGetCatalogsToGetDatasetUrls(EXAMPLE_DATA_CATALOG_COLLECTION);
```
