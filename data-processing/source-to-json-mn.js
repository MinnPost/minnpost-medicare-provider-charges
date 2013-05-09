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
var csv = require('csv');
var _ = require('underscore');
var ss = require('simple-statistics');


// Top level variables
var input = 'data/original/Medicare_Provider_Charge_Inpatient_DRG100_FY2011.csv';
var inputFile = path.resolve(__dirname, '../' + input);
var outputPath = path.resolve(__dirname, '../data/converted/');
var stateFilter = 'MN';
var noProvidersFlag = '--no-providers';
var noProviders = (process.argv.indexOf(noProvidersFlag) > 0) ? true : false;
// Please don't steal
var mapQuestAppKey = 'Fmjtd%7Cluub2d61n9%2C7a%3Do5-9u2nlw';

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
      if (index === 0) {
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
        geocodeProviders(function() {
          saveNewFile('providers.json', providers);
        });
      }
      
      makeStats();
      saveNewFile('stats.json', stats);
    })
    .on('error', function(error) {
      console.log('Error: ' + error.message);
    });
}

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
}

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
}

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
}

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
}

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
    groups = [drg, state + '-' + drg];
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
}

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
}

// Geocode providers
function geocodeProviders(callback) {
  // The MapQuest open geocoding is just not that good, even after
  // standardizing addresses, so we are using the non-open one
  //var base = 'http://open.mapquestapi.com/geocoding/v1/batch?';
  var base = 'http://www.mapquestapi.com/geocoding/v1/batch?key=' + mapQuestAppKey + '&';
  var query = [];

  // Use the batch location ability with
  // Mapquest
  // See: http://open.mapquestapi.com/geocoding/#batch
  _.each(providers, function(p) {
    query.push('location=' + encodeURI(translateStreet(p.street) + 
      ', ' + translateCity(p.city) + ', ' + p.state + ', ' + p.zip));
  });

  console.log('Goecoding providers...');
  http.get(base + query.join('&'), function(res) {
    var data = '';

    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end', function(err) {
      data = JSON.parse(data);
      console.log('Returning results: ' + _.size(data.results));
    
      _.each(data.results, function(r) {
        if (_.isArray(r.locations) && r.locations.length > 0) {
          // Assume first one is the one we want and that it
          // is accurate
          // See http://www.mapquestapi.com/geocoding/geocodequality.html
          if (r.locations[0].geocodeQuality === 'ADDRESS' || r.locations[0].geocodeQuality === 'POINT') {
            // This could probably be more efficient
            _.each(providers, function(p, i) {
              var queryAddress = translateStreet(p.street) + ', ' + translateCity(p.city) + 
                ', ' + p.state + ', ' + p.zip;
              
              if (r.providedLocation.location.toLowerCase() == queryAddress.toLowerCase()) {
                providers[i].lng = r.locations[0].latLng.lng;
                providers[i].lat = r.locations[0].latLng.lat;
              }
            });
          }
          // There is one address that is off a bit
          else if (r.providedLocation.location.toLowerCase() == '855 Mankato Ave, WINONA, MN, 55987'.toLowerCase()) {
            providers['240044'].lat = 44.033478;
            providers['240044'].lng = -91.623724;
          }
          else {
            console.log('Location not ADDRESS/POINT quality: ' + r.providedLocation.location);
            console.log(r.locations[0]);
          }
        }
        else {
          console.log('Did not find a location for: ' + r.providedLocation.location);
        }
      });
      
      if (_.isFunction(callback)) {
        callback();
      }
    });

    res.on('error', function(err) {
      console.log(err);
    });
  });
}

// Street translations
function translateStreet(street) {
  var translations = {
    '3300 OAKDALE NORTH': '3300 Oakdale Ave N',
    '701 PARK AVENUE': '701 Park Ave S',
    '1650 FOURTH STREET SOUTHEAST': '1650 4th St SE',
    '1216 SECOND STREET WEST': '1216 2nd St SW',
    '2000 NORTH AVENUE': '2000 North Ave',
    '701 FAIRVIEW BOULEVARD, PO BOX 95': '701 Fairview Blvd',
    '502 EAST SECOND STREET': '502 E 2nd St',
    '701 SOUTH DELLWOOD': '701 Dellwood St S',
    '1018 SIXTH AVENUE PO BOX 997': '1018 6th Ave',
    '333 NORTH SMITH': '333 Smith Ave',
    '712 SOUTH CASCADE': '712 S Cascade St',
    '1601 GOLF COURSE ROAD': '1601 Golf Course Rd',
    '927 WEST CHURCHILL STREET': '927 Churchill St W',
    '2250 26TH STREET NORTHWEST': '2250 NW 26th St',
    '1025 MARSH STREET BOX 8673': '1025 Marsh St',
    '1000 FIRST DRIVE NORTHWEST': '1000 1st Dr NW',
    '550 OSBORNE ROAD': '550 Osborne Rd NE',
    '911 NORTHLAND DR': '911 Northland Boulevard',
    '835 JOHNSON STREET, PO BOX 835': '835 Johnson St',
    '1095 HIGHWAY 15 SOUTH': '1095 Highway 15 S',
    '855 MANKATO AVENUE': '855 Mankato Ave'
  };
  street = street.toUpperCase().trim();
  
  return (!_.isUndefined(translations[street])) ? 
    translations[street] : street;
}

// City translations
function translateCity(city) {
  var translations = {
    'SAINT PAUL': 'St. Paul',
    'SAINT LOUIS PAR': 'St. Louis Park' 
    
  };
  city = city.toUpperCase().trim();
  
  return (!_.isUndefined(translations[city])) ? 
    translations[city] : city;
}


// Launch
processCSV();