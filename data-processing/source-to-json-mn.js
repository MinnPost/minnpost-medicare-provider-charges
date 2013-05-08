/**
 * This is a script to convert the original CSV data to JSON files
 * specific for our application
 *
 * Use flag "--no-providers" to not update providers, which means, not
 * running geocoding
 *
 * Note that DC is considered a state in this data.
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
var http = require('http');
var url = require('url');
var util = require('util');
var office = require('csv');
var _ = require('underscore');
var ss = require('simple-statistics');


// Top level variables
var input = 'data/original/Medicare_Provider_Charge_Inpatient_DRG100_FY2011.csv';
var inputFile = path.resolve(__dirname, '../' + input);
var outputPath = path.resolve(__dirname, '../data/converted/');
var stateFilter = 'MN';
var noProvidersFlag = '--no-providers';
var noProviders = (process.argv.indexOf(noProvidersFlag) > 0) ? true : false;

// Data holders
var headers;
var drgs = {};
var providers = {};
var charges = [];
var stats = {};


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
      var drgCode, providerCode;
    
      // If first row, get headers, else filter
      // by state
      if (index == 0) {
        headers = row;
      }
      else {
        drgCode = processDRG(row[0], index);
        
        // Get state level stats
        processStats(row, drgCode, index);
        
        // Only get MN data
        if (row[5].toUpperCase() === stateFilter) {
          providerCode = (noProviders) ? row[1] : processProviders(row, index);
          processCharges(drgCode, providerCode, row, index);
        }
      }
    })
    .on('end', function(count) {
      saveNewFile('drgs.json', drgs);
      saveNewFile('charges.json', charges);
      
      if (!noProviders) {
        geocodeProviders();
        saveNewFile('providers.json', providers);
      }
      
      makeStats();
      saveNewFile('stats.json', stats);
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
      console.log('JSON saved to ' + file + ' with ' + _.size(data) + ' rows.');
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
  
  return split[1];
};

// Handle Providers (row[1] - row[7])
function processProviders(row, index) {
  var provider;

  if (!row[1]) {
    console.log('Provider ID value is not found on row: ' + index);
  }
  
  provider = {
    id: row[1],
    name: row[2],
    street: row[3],
    city: row[4],
    state: row[5],
    zip: row[6],
    hrr: row[7]
  };
  
  // TODO: geocode address
  // 
  
  // Add to Providers data
  if (_.isUndefined(providers[row[1]])) {
    providers[row[1]] = provider;
  }
  else {
    // Check if street names are the same
    if (providers[row[1]].street.toLowerCase() != provider.street.toLowerCase()) {
      console.log('Provider street name mismatch on: ' + 
        row[1] + ' | ' + providers[row[1]].street + ' | ' + provider.street);
    }
  }
  
  return row[1];
};

// Handle charges
function processCharges(drgCode, providerCode, row, index) {
  var charge, found;

  if (!row[8]) {
    console.log('Total Discharge value is not found on row: ' + index);
  }
  
  charge = {
    drg: drgCode,
    provider: providerCode,
    totDischg: parseFloat(row[8]),
    avgCovChg: parseFloat(row[9]),
    avgTotPay: parseFloat(row[10])
  };
  
  // Double check that there are no duplicate value
  found = _.find(charges, function(c) {
    return _.isEqual(charge, c);
  });
  if (found) {
    console.log('Found duplicate charge.');
    console.log(found);
    console.log(row);
  }
  
  charges.push(charge);
};

// Process stats data to be used at the end
function processStats(row, drg, index) {
  var col = {
    8: 'totDischg',
    9: 'avgCovChg',
    10: 'avgTotPay',
    11: 'diffChgPay',
    12: 'perPay'
  };
  var state = row[5];
  var groups = [drg];
  
  // Get some extra values
  row[11] = parseFloat(row[9]) - parseFloat(row[10]);
  row[12] = (parseFloat(row[9]) - parseFloat(row[10])) / (parseFloat(row[9]));
  
  // Only handle filtered state to get DRG stats
  if (state === stateFilter) {
    groups = [drg, state + '-' + drg]
  }
  
  // Collect stats by DRG and state-DRG and US-DRG groups
  _.each(groups, function(stat) {
    _.each(col, function(field, colNum) {
      stats[stat] = stats[stat] || {};
      stats[stat][field] = stats[stat][field] || {};
      stats[stat][field].values = stats[stat][field].values || [];
      stats[stat][field].values.push(parseFloat(row[colNum]));
    });
  });
};

// Using the values we got from before make stats
function makeStats() {
  _.each(stats, function(stat, statGroup) {
    _.each(stat, function(s, field) {
      
      if (!s.values) {
        console.log('Issue with stat for group: ' + statGroup);
      }
      
      stats[statGroup].count = s.values.length;
      
      //stats[statGroup][field].sum = ss.sum(s.values);
      //stats[statGroup][field].min = ss.min(s.values);
      //stats[statGroup][field].max = ss.max(s.values);
      stats[statGroup][field].mean = ss.mean(s.values);
      stats[statGroup][field].median = ss.median(s.values);
      //stats[statGroup][field].mode = ss.mode(s.values);
      //stats[statGroup][field].variance = ss.variance(s.values);
      //stats[statGroup][field].standard_deviation = ss.standard_deviation(s.values);
    });
  });
  
  _.each(stats, function(stat, statGroup) {
    _.each(stat, function(s, field) {
      // Remove actual values
      delete stats[statGroup][field].values;
    });
  });
};

// Geocode providers
function geocodeProviders() {
  var base = 'http://open.mapquestapi.com/geocoding/v1/batch?';
  var query = [];

  // Use the batch location ability with
  // Mapquest
  // See: http://open.mapquestapi.com/geocoding/#batch
  _.each(providers, function(p) {
    query.push('location=' + encodeURI(p.street + ', ' + p.city + ', ' + p.state + ', ' + p.zip));
  });

  console.log(base + query.join('&'));
  http.get(base + query.join('&'), function(res) {
    var data = ''

    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end', function(err) {
      console.log(util.inspect(data, false, null));
    });

    res.on('error', function(err) {
      console.log(err);
    });
  })
};

// Launch
processCSV();