/**
 * Some core functionality for minnpost-medicare-provider-charges
 */

/**
 * Global variable to handle some things
 * like templates.
 */
var mpApp = mpApp || {};
mpApp['minnpost-medicare-provider-charges'] = mpApp['minnpost-medicare-provider-charges'] || {};

/**
 * Extend underscore
 */
_.mixin({
  /**
   * Formats number into currency
   */
  formatCurrency: function(num) {
    var rgx = (/(\d+)(\d{3})/);
    split = num.toFixed(2).toString().split('.');
    while (rgx.test(split[0])) {
      split[0] = split[0].replace(rgx, '$1' + ',' + '$2');
    }
    return '$' + split[0] + '.' + split[1];
  },
  
  /**
   * Formats percentage
   */
  formatPercentage: function(num) {
    return (num * 100).toFixed(1).toString() + '%';
  }
});


/**
 * Non global
 */
(function(app, $, undefined) {
  /**
   * Template handling.  For development, we want to use
   * the template files directly, but for build, they should be
   * compiled into JS.
   *
   * See JST grunt plugin to understand how templates
   * are compiled.
   *
   * Expects callback like: function(compiledTemplate) {  }
   */
  app.templates = app.templates || {};
  app.getTemplate = function(name, callback, context) {
    var templatePath = 'js/templates/' + name + '.html';
    context = context || app;
    
    if (!_.isUndefined(app.templates[templatePath])) {
      callback.apply(context, [ app.templates[templatePath] ]);
    }
    else {
      $.ajax({
        url: templatePath,
        method: 'GET',
        async: false,
        contentType: 'text',
        success: function(data) {
          app.templates[templatePath] = _.template(data);
          callback.apply(context, [ app.templates[templatePath] ]);
        }
      });
    }
  };
  
  /**
   * Data source handling.  For development, we can call
   * the data directly from the JSON file, but for production
   * we want to proxy for JSONP.
   *
   * `name` should be relative path to dataset minus the .json
   *
   * Returns jQuery's defferred object.
   */
  app.data = app.data || {};
  app.getData = function(name) {
    var proxyPrefix = 'http://mp-jsonproxy.herokuapp.com/proxy?callback=?&url=';
    var useJSONP = false;
    var defers = [];
    
    name = (_.isArray(name)) ? name : [ name ];
    
    // If the data path is not relative, then use JSONP
    if (app.options.dataPath.indexOf('http') === 0) {
      useJSONP = true;
    }
    
    // Go through each file and add to defers
    _.each(name, function(d) {
      var defer;
      
      if (useJSONP) {
        defer = $.jsonp({
          url: proxyPrefix + encodeURI(app.options.dataPath + d + '.json')
        });
      }
      else {
        defer = $.getJSON(app.options.dataPath + d + '.json');
      }
      
      defers.push(defer);
    });
    
    return $.when.apply($, defers);
  };
})(mpApp['minnpost-medicare-provider-charges'], jQuery);

this["mpApp"] = this["mpApp"] || {};
this["mpApp"]["minnpost-medicare-provider-charges"] = this["mpApp"]["minnpost-medicare-provider-charges"] || {};
this["mpApp"]["minnpost-medicare-provider-charges"]["templates"] = this["mpApp"]["minnpost-medicare-provider-charges"]["templates"] || {};

this["mpApp"]["minnpost-medicare-provider-charges"]["templates"]["js/templates/template-container.html"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class="main-container">\n\n  <div class="map-container">\n    <div id="provider-map"></div>\n  </div>\n  \n  <div class="search-container">\n  \n  </div>\n  \n  <div class="results-container">\n  \n  </div>\n\n</div>';

}
return __p
};

this["mpApp"]["minnpost-medicare-provider-charges"]["templates"]["js/templates/template-error.html"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class="error-container">\n  <div class="error"><span>There was an error.  ' +
((__t = ( (error) ? error : '' )) == null ? '' : __t) +
'</span></div>\n</div>';

}
return __p
};

this["mpApp"]["minnpost-medicare-provider-charges"]["templates"]["js/templates/template-loading.html"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class="loading-general-container">\n  <div class="loading-general"><span>Loading...</span></div>\n</div>';

}
return __p
};

this["mpApp"]["minnpost-medicare-provider-charges"]["templates"]["js/templates/template-map-popup.html"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class="map-popup">\n  <h3>' +
((__t = ( p.name )) == null ? '' : __t) +
'</h3>\n  \n  ' +
((__t = ( p.street )) == null ? '' : __t) +
'<br />\n  ' +
((__t = ( p.city )) == null ? '' : __t) +
', ' +
((__t = ( p.state )) == null ? '' : __t) +
' ' +
((__t = ( p.zip )) == null ? '' : __t) +
'\n</div>';

}
return __p
};

this["mpApp"]["minnpost-medicare-provider-charges"]["templates"]["js/templates/template-provider.html"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<div class="providers clear-block">\n  <h3>' +
((__t = ( (p) ? p.name : '')) == null ? '' : __t) +
'</h3>\n  \n  <table>\n    <thead>\n      <tr>\n        <th>Clinical conditions, diagnoses, procedures (number reported)</th>\n        \n        <th>Avg chg</th>\n        <th>Avg payed</th>\n        <th>% payed</th>\n      </tr>\n    </thead>\n    \n    <tbody>\n      ';
 _.each(_.sortBy(p.charges, function(c) { return (-1 * c.totDischg) }), function(c, i) { ;
__p += '\n        <tr>\n          <td>' +
((__t = ( drgs[c.drg] )) == null ? '' : __t) +
' (' +
((__t = ( c.totDischg )) == null ? '' : __t) +
')</td>\n          \n          ';
 _.each(['avgCovChg', 'avgTotPay', 'perPay'], function(stat) { ;
__p += '\n            <td>\n              <div class="box-plot average-coverage-charge" \n                data-median="' +
((__t = ( stats[statPrefix + c.drg][stat].median )) == null ? '' : __t) +
'" \n                data-q25="' +
((__t = ( stats[statPrefix + c.drg][stat].q25 )) == null ? '' : __t) +
'" \n                data-q75="' +
((__t = ( stats[statPrefix + c.drg][stat].q75 )) == null ? '' : __t) +
'" \n                data-min="' +
((__t = ( stats[statPrefix + c.drg][stat].stepL )) == null ? '' : __t) +
'" \n                data-max="' +
((__t = ( stats[statPrefix + c.drg][stat].stepU )) == null ? '' : __t) +
'" \n                data-value="' +
((__t = ( c[stat] )) == null ? '' : __t) +
'" \n                data-axis-max="' +
((__t = ( p['max' + stat] )) == null ? '' : __t) +
'"></div>\n            </td>\n          ';
 }) ;
__p += '\n        </tr>\n      ';
 }) ;
__p += '\n    </tbody>\n  </table>\n  \n</div>';

}
return __p
};

/**
 * Main application for minnpost-medicare-provider-charges.
 */

/**
 * Close around functionality
 */
(function(app, $, undefined) {
  app.ProviderModel = Backbone.Model.extend({
    mapMarkerStyle: {
      stroke: false,
      fillOpacity: 0.75,
      fillColor: '#222222',
      radius: 4
    },
    
    mapMarkerHighlight: {
      stroke: true,
      color: '#BCBCBC',
      fillOpacity: 0.95,
      fillColor: '#787878',
      radius: 7
    },
    
    initialize: function() {
      // Get charges
      this.set('charges', _.where(app.data.charges, { provider: this.id }));
      this.setMaxes();
    },
    
    setMaxes: function() {
      var thisModel = this;
      _.each(['avgCovChg', 'avgTotPay', 'perPay'], function(s) {
        thisModel.set('max' + s, _.max(thisModel.get('charges'), function(c) { return c[s]; })[s]);
      });
      
      this.set('maxperPay', 1);
      this.set('maxavgCovChg', (this.get('maxavgCovChg') < 130000) ? 130000 : this.get('maxavgCovChg'));
      this.set('maxavgTotPay', (this.get('maxavgTotPay') < 30000) ? 30000 : this.get('maxavgTotPay'));
    },
    
    addMarker: function(map, markerOutput) {
      var thisModel = this;
      
      var circle = new L.CircleMarker([this.get('lat'), this.get('lng')], this.mapMarkerStyle);
      circle.addTo(map)
        .bindPopup(markerOutput)
        .on('click', function() {
          circle.setStyle(thisModel.mapMarkerHighlight);
          app.router.navigate('/provider/' + thisModel.id, { trigger: true, replace: true });
        })
        .on('mouseover', function() {
          circle.setStyle(thisModel.mapMarkerHighlight);
        })
        .on('mouseout', function() {
          circle.setStyle(thisModel.mapMarkerStyle);
        });
      
      this.set('marker', circle);
      return this;
    }
  });
  
  app.ProvidersCollection = Backbone.Collection.extend({
    model: app.ProviderModel,
    
    comparator: 'name'
  });
  
  app.AppView = Backbone.View.extend({
    el: '#minnpost-medicare-provider-charges',
    providerEl: '.results-container',
    
    mapOptions: {
      scrollWheelZoom: false
    },
    
    mapLayers: {
      'Streets': new L.TileLayer('http://{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png'),
      'Satellite': new L.TileLayer('http://{s}.tiles.mapbox.com/v3/minnpost.map-95lgm5jf/{z}/{x}/{y}.png')
    },
    
    initialize: function() {
      this.templates = this.templates || {};
    },
    
    render: function() {
      app.getTemplate('template-container', function(template) {
        this.$el.html(template({ }));
      }, this);
      return this;
    },
    
    renderMap: function(providers) {
      var thisView = this;
      
      this.map = new L.Map('provider-map', this.mapOptions).setView([46.708, -93.056], 6);
      this.map.addLayer(this.mapLayers.Streets);
      this.map.addControl(new L.control.layers(this.mapLayers));
      this.map.attributionControl.setPrefix(false);
      
      providers.each(function(p) {
        app.getTemplate('template-map-popup', function(template) {
          p.addMarker(thisView.map, template({ p: p.toJSON() }));
        }, this);
      });
      
      return this;
    },
    
    renderProvider: function(provider) {
      var thisView = this;
      
      app.getTemplate('template-provider', function(template) {
        thisView.$el.find(thisView.providerEl).html(
          template({
            p: (_.isObject(provider)) ? provider.toJSON() : false,
            statPrefix: 'FL-',
            drgs: app.data.drgs,
            stats: app.data.stats 
          }));
          
          $('.box-plot').each(function() {
            thisView.renderBoxPlot($(this));
          });
      });
      
      return this;
    },
    
    renderLoading: function(message) {
      app.getTemplate('template-loading', function(template) {
        this.templates.loading = template;
        this.$el.html(this.templates.loading({ message: message }));
      }, this);
      return this;
    },
    
    renderError: function(e) {
      app.getTemplate('template-error', function(template) {
        this.templates.error = template;
        this.$el.html(this.templates.error({ error: e }));
      }, this);
      return this;
    },
    
    renderBoxPlot: function(el) {
      var $el = $(el);
      var w = $el.width();
      var h = $el.height();
      var stats = $el.data();
      var paper = new Raphael($el[0], w, h);
      var axisMin = 0;
      var axisMax = 250000;
      var vPadding = h * 0.1;
      var boxHeight = h - (vPadding * 2);
      axisMax = (stats.axisMax) ? parseFloat(stats.axisMax) : axisMax;
      axisMin = (stats.axisMin) ? parseFloat(stats.axisMin) : axisMin;
      
      // Find x coordinates
      var minX = this.scaleValue(axisMin, axisMax, stats.min, w);
      var q25X = this.scaleValue(axisMin, axisMax, stats.q25, w);
      var medianX = this.scaleValue(axisMin, axisMax, stats.median, w);
      var q75X = this.scaleValue(axisMin, axisMax, stats.q75, w);
      var maxX = this.scaleValue(axisMin, axisMax, stats.max, w);
      var valueX = this.scaleValue(axisMin, axisMax, stats.value, w);

      // Min Max and "wiskers"
      paper.rect(minX, vPadding * 2, 1, boxHeight - (vPadding * 2)).attr({ stroke: '#787878' });
      paper.rect(maxX, vPadding * 2, 1, boxHeight - (vPadding * 2)).attr({ stroke: '#787878' });
      paper.rect(minX, (h / 2), q25X - minX, 0.5).attr({ stroke: '#787878' });
      paper.rect(q75X, (h / 2), maxX - q75X, 0.5).attr({ stroke: '#787878' });
  
      // Quartiles and median
      paper.rect(q25X, vPadding, q75X - q25X, boxHeight).attr({ stroke: '#787878' });
      paper.rect(medianX, vPadding, 1, boxHeight).attr({ stroke: '#242424' });

      // Value
      paper.rect(valueX, 0, 1, h).attr({ stroke: 'red' });
    },
    
    scaleValue: function(min, max, value, width) {
      return ((value - min) / (max - min)) * width;
    }
  });
  
  app.Application = Backbone.Router.extend({
    routes: {
      'map': 'routeMap',
      'provider/:provider': 'routeProvider',
      '*defaultR': 'routeDefault'
    },
    
    defaultOptions: {
      imagePath: './css/images/',
      dataPath: './data/converted/'
    },
    
    dataSets: ['charges', 'drgs', 'providers', 'stats'],
    
    displayProviders: [],
  
    initialize: function(options) {
      var thisApp = this;
      app.router = this;
    
      // Store intial options for globa use
      app.options = _.extend(this.defaultOptions, options);
      
      // Leaflet needs to know where images are (hackish)
      if (app.options.imagePath.indexOf('http') === 0) {
        L.Icon.Default.imagePath = app.options.imagePath.slice(0, -1);
      }
      
      // Create objects that are needed app wide
      this.mainView = new app.AppView({
        el: options.el
      });
      this.mainView.renderLoading();
    
      // Get raw data
      app.getData(this.dataSets)
        .done(function() {
          app.data.charges = arguments[0][0];
          app.data.drgs = arguments[1][0];
          app.data.providers = arguments[2][0];
          app.data.stats = arguments[3][0];
          thisApp.processData();
        })
        .fail(function() {
          thisApp.mainView.renderError();
        });
    },
    
    // Process data and make objects
    processData: function(data) {
      var thisApp = this;
      
      // Get percentage paid
      _.each(app.data.charges, function(c, i) {
        app.data.charges[i].perPay = (c.avgTotPay / c.avgCovChg);
      });
    
      // Create providers collections
      this.providers = new app.ProvidersCollection();
      _.each(app.data.providers, function(p, i) {
        thisApp.providers.add(new app.ProviderModel(p));
      });
      
      // Render main container
      this.mainView.render();
      this.mainView.renderMap(this.providers);
      this.start();
    },
    
    // Start application (after data has been loaded)
    start: function() {
      // Start handling routing and history
      Backbone.history.start();
    },
  
    // Default route
    routeDefault: function() {
      //this.navigate('/map', { trigger: true, replace: true });
    },
    
    routeProvider: function(provider) {
      var thisApp = this;
      
      thisApp.mainView.renderProvider(this.providers.get(provider));
    }
  });
  
})(mpApp['minnpost-medicare-provider-charges'], jQuery);