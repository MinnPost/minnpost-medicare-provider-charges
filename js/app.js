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
            .bindPopup(template({ p: p.toJSON() }));
          
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
      dataPath: './data/converted/'
    },
    
    dataSets: ['charges', 'drgs', 'providers', 'stats'],
  
    initialize: function(options) {
      var thisApp = this;
    
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