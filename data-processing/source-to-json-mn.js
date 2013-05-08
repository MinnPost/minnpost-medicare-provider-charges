/**
 * This is a script to convert the original CSV data to JSON files
 * specific for our application
 *
 * For reference
 * 0: 'DRG Definition',
 * 1: 'Provider Id',
 * 2: 'Provider Name',
 * 3: 'Provider Street Address',
 * 4: 'Provider City',
 * 5: 'Provider State',
 * 6: 'Provider Zip Code',
 * 7: 'Hospital Referral Region Description',
 * 8: 'Total Discharges',
 * 9: 'Average Covered Charges',
 * 10:'Average Total Payments'
 */
var path = require('path');
var fs = require('fs');
var office = require('csv');
var _ = require('underscore');


// Top level variables
var input = 'data/original/Medicare_Provider_Charge_Inpatient_DRG100_FY2011.csv';
var inputFile = path.resolve(__dirname, '../' + input);
var outputPath = path.resolve(__dirname, '../data/converted/');
var stateFilter = 'MN';

// Data holders
var headers;
var drgs = {};
var providers = {};
var charges = [];


// Go through CSV
function processCSV() {
  var csvProcessor = csv()
    .from.stream(fs.createReadStream(inputFile))
    .transform(function(row) {
      // Trim data
      row = _.map(row, function(column) {
        column = (_.isString(column)) ? column.trim() : column;
        return column;
      });
      return row;
    })
    .on('record', function(row, index) {
      var drg;
    
      // If first row, get headers, else filter
      // by state
      if (index == 0) {
        headers = row;
      }
      else {
        processDRG(row[0], index);
        
        // Only get MN data
        if (row[5].toUpperCase() === stateFilter) {
        
        }
      }
    })
    .on('end', function(count) {
      saveNewFile('drgs.json', drgs);
      
    })
    .on('error', function(error) {
      console.log('Error: ' + error.message);
    });
};

// Save out data
function saveNewFile(file, data) {
  var outputFile = path.resolve(outputPath, './' + file);

  fs.writeFile(outputFile, JSON.stringify(data), function(error) {
    if (error) {
      console.log('Error saving ' + file + ': ' + error);
    } 
    else {
      console.log('JSON saved to ' + file + '.');
    }
  }); 
};

// Handle DRG data
function processDRG(drg, index) {
  var split;

  if (!drg) {
    console.log('DRG value is not found on row: ' + index);
  }
  
  // Split DRG defs
  // Eaxmple: 039 - EXTRACRANIAL PROCEDURES W/O CC/MCC
  split = drg.split(/^([0-9]+)( - )/g);
  
  // Check value
  if (!split[1].trim() || !split[3].trim()) {
    console.log('DRG split failure on: ' + drg);
  }
  
  // Add to DRGs
  if (_.isUndefined(drgs[split[1]])) {
    drgs[split[1]] = split[3].trim();
  }
  else {
    // Check if descriptions and IDs are the same
    if (drgs[split[1]].toLowerCase() != split[3].trim().toLowerCase()) {
      console.log('DRG Description mismatch on: ' + 
        split[1] + ' | ' + drgs[split[1]] + ' | ' + split[3].trim());
    }
  }
};


// Launch
processCSV();