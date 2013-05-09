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

/**
 * Main application for minnpost-medicare-provider-charges.
 */

/**
 * Close around functionality
 */
(function(app, $, undefined) {
  app.ProviderModel = Backbone.Model.extend({
    initialize: function() {
      // Get charges
      this.set('charges', _.where(app.data.charges, { provider: this.id }));
    }
  });
  
  app.ProvidersCollection = Backbone.Collection.extend({
    model: app.ProviderModel,
    
    comparator: 'name'
  });
  
  app.AppView = Backbone.View.extend({
    el: '#minnpost-medicare-provider-charges',
    
    mapBaseLayer: new L.TileLayer(
      'http://{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png', 
      { attribution: 'Map tiles &copy; <a href="http://mapbox.com">MapBox</a>', maxZoom: 17 }
    ),
    
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
      
      this.map = new L.Map('provider-map').setView([46.708, -93.056], 6);
      this.mapBaseLayer.addTo(this.map);
      
      providers.each(function(p) {
        app.getTemplate('template-map-popup', function(template) {
          L.marker([p.get('lat'), p.get('lng')]).addTo(thisView.map)
            .bindPopup(template({ p: p.toJSON() }))
            .openPopup();
          
        }, this);
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
    }
  });
  
  app.Application = Backbone.Router.extend({
    routes: {
      'map': 'routeMap',
      '*defaultR': 'routeDefault'
    },
    
    defaultOptions: {
      imagePath: './css/images/',
      dataPath: './data/'
    },
    
    dataSet: ['converted/charges', 'converted/drgs', 
      'converted/providers', 'converted/stats'],
  
    initialize: function(options) {
      var thisApp = this;
    
      // Store intial options for globa use
      app.options = _.extend(this.defaultOptions, options);
      
      // Create objects that are needed app wide
      this.mainView = new app.AppView({
        el: options.el
      });
      this.mainView.renderLoading();
    
      // Get raw data
      app.getData(this.dataSet)
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
    
      // Create providers collections
      this.providers = new app.ProvidersCollection();
      _.each(app.data.providers, function(p, i) {
        thisApp.providers.add(new app.ProviderModel(p));
      });
      
      // Render main container
      this.mainView.render();
      this.start();
    },
    
    // Start application (after data has been loaded)
    start: function() {
      // Start handling routing and history
      Backbone.history.start();
    },
  
    // Default route
    routeDefault: function() {
      this.navigate('/map', { trigger: true, replace: true });
    },
    
    routeMap: function() {
      this.mainView.renderMap(this.providers);
    }
  });
  
})(mpApp['minnpost-medicare-provider-charges'], jQuery);