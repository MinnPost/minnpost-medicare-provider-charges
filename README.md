# MN Medicare Provider Charges

An interactive analysis of 2011 Medicare provider charges data released by the CMS for MN

## Data

Data provided by the Centers for Medicare and Medicaid Services (CMS).

* [Link to page describing data](https://www.cms.gov/Research-Statistics-Data-and-Systems/Statistics-Trends-and-Reports/Medicare-Provider-Charge-Data/index.html).
* [Excel](https://www.cms.gov/Research-Statistics-Data-and-Systems/Statistics-Trends-and-Reports/Medicare-Provider-Charge-Data/Downloads/IPPS_DRG_XLSX.zip) (data definition copied to text file)
* [CSV](https://www.cms.gov/Research-Statistics-Data-and-Systems/Statistics-Trends-and-Reports/Medicare-Provider-Charge-Data/Downloads/IPPS_DRG_CSV.zip) (provided in this repo)

## Data processing

* In order to turn the data into manageable JSON files, run the following: `node data-processing/source-to-json-mn.js`
    * Use the `--no-providers` flag to not process providers and therefore nor run the geocoding.
    * Geocoding provided by [MapQuest](http://www.mapquestapi.com/geocoding/).

## Install

Prerequisites:

1. Install node: `brew install node`
1. Install bower: `npm install -g bower`

Packages:

1. `bower install`
1. `npm install`

## Build

Prerequisites:

1. Install node: `npm install -g grunt-cli`

Build: 

1. (optional) Update version in `package.json`
1. Run `grunt`

## Deploy

1. Run `grunt mp-deploy`