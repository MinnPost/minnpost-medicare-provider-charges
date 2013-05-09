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
    },
    
    addMarker: function(map, markerOutput) {
      var thisModel = this;
      
      var circle = new L.CircleMarker([this.get('lat'), this.get('lng')], this.mapMarkerStyle);
      circle.addTo(map)
        .bindPopup(markerOutput)
        .on('click', function() {
          circle.setStyle(thisModel.mapMarkerHighlight);
          app.router.showProvider(thisModel.id);
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
      
      this.map = new L.Map('provider-map').setView([46.708, -93.056], 6);
      this.map.addLayer(this.mapLayers['Streets']);
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
        thisView.$el.find(thisView.providerEl).append(template({ p: provider.toJSON() }));
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
      'providers/*providers': 'routeProviders',
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
    
    routeProviders: function(providers) {
      var thisApp = this;
      
      this.displayProviders = providers.split('/');
      if (this.displayProviders.length > 2) {
        this.displayProviders.splice(0, 1);
      }
      
      _.each(this.displayProviders, function(p) {
        thisApp.mainView.renderProvider(thisApp.providers.get(p));
      });
    },
    
    showProvider: function(p) {
      if (this.displayProviders.length >= 2) {
        this.displayProviders.shift();
        this.displayProviders.push(p)
      }
      else {
        this.displayProviders.push(p);
      }
      
      console.log(this.displayProviders);
      this.navigate('/providers/' + this.displayProviders.join('/'), { trigger: true, replace: true });
    }
  });
  
})(mpApp['minnpost-medicare-provider-charges'], jQuery);