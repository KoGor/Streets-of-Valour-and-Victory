// From http://www.tutorialspoint.com/javascript/array_map.htm
if (!Array.prototype.map)
{
  Array.prototype.map = function(fun /*, thisp*/)
  {
    var len = this.length;
    if (typeof fun !== "function")
      throw new TypeError();

    var res = new Array(len);
    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in this)
        res[i] = fun.call(thisp, this[i], i, this);
    }

    return res;
  };
}

L.Control.FuseSearch = L.Control.extend({
    
    includes: L.Mixin.Events,
    
    options: {
        position: 'topright',
        panelWidth: 360,
        title: 'Search',
        placeholder: 'Search',
        caseSensitive: false,
        threshold: 0.5,
        maxResultLength: null,
        showResultFct: null,
        showInvisibleFeatures: true
    },
    
    initialize: function(options) {
        L.setOptions(this, options);
        this._panelOnLeftSide = (this.options.position.indexOf("left") !== -1);
    },
    
    onAdd: function(map) {
        
        var ctrl = this._createControl();
        this._setEventListeners();
        map.invalidateSize();
        
        return ctrl;
    },
    
    onRemove: function(map) {
        
        this.hidePanel(map);
        this._clearEventListeners();
        this._clearControl();
        
        return this;
    },
    
    _createControl: function() {

        var _this = this;
        var container = this._panel = L.DomUtil.create('div', 'leaflet-fusesearch-control');

        // Control to open the search panel
        var butt = this._openButton = L.DomUtil.create('a', 'button', container);
        butt.href = '#';
        butt.title = this.options.title;
        var stop = L.DomEvent.stopPropagation;
        L.DomEvent.on(butt, 'click', stop)
                  .on(butt, 'mousedown', stop)
                  .on(butt, 'touchstart', stop)
                  .on(butt, 'mousewheel', stop)
                  .on(butt, 'MozMousePixelScroll', stop);
        L.DomEvent.on(butt, 'click', L.DomEvent.preventDefault);
        L.DomEvent.on(butt, 'click', this.showPanel, this);

        // place the panel on the same side as the control
        if (this._panelOnLeftSide) {
            L.DomUtil.addClass(container, 'left');
        } else {
            L.DomUtil.addClass(container, 'right');
        }

        this._input = L.DomUtil.create('input', 'search-input', container);
        this._input.maxLength = 30;
        this._input.placeholder = this.options.placeholder;
        this._input.onkeyup = function(evt) {
            var searchString = evt.currentTarget.value;
            _this.searchFeatures(searchString);
        };

        // Close button
        var close = this._closeButton = L.DomUtil.create('a', 'close', container);
        close.innerHTML = '&times;';
        L.DomEvent.on(close, 'click', this.hidePanel, this);

        // Where the result will be listed
        this._resultList = L.DomUtil.create('div', 'result-list', container); 
        
        return container;
    },
    
    _clearControl: function() {
        // Unregister events to prevent memory leak
        var butt = this._openButton;
        var stop = L.DomEvent.stopPropagation;
        L.DomEvent.off(butt, 'click', stop)
                  .off(butt, 'mousedown', stop)
                  .off(butt, 'touchstart', stop)
                  .off(butt, 'mousewheel', stop)
                  .off(butt, 'MozMousePixelScroll', stop);
        L.DomEvent.off(butt, 'click', L.DomEvent.preventDefault);
        L.DomEvent.off(butt, 'click', this.showPanel);

        L.DomEvent.off(this._closeButton, 'click', this.hidePanel);
    },
    
    _setEventListeners : function() {
        var that = this;
        var input = this._input;
        this._map.addEventListener('overlayadd', function() {
            that.searchFeatures(input.value);
        });
        this._map.addEventListener('overlayremove', function() {
            that.searchFeatures(input.value);
        });
    },
    
    _clearEventListeners: function() {
        this._map.removeEventListener('overlayadd');
        this._map.removeEventListener('overlayremove');        
    },
    
    isPanelVisible: function () {
        return L.DomUtil.hasClass(this._panel, 'visible');
    },

    showPanel: function () {
        if (! this.isPanelVisible()) {
            L.DomUtil.addClass(this._panel, 'visible');
            L.DomEvent.off(this._openButton, 'click', this.hidePanel);
            // Preserve map centre
            this._map.panBy([this.getOffset() * 0.5, 0], {duration: 0.5});
            this.fire('show');
            L.DomUtil.addClass(this._input, 'visible');
            L.DomUtil.addClass(this._closeButton, 'visible');
            L.DomUtil.addClass(this._resultList, 'visible');
            this._input.select();
            // Search again as visibility of features might have changed
            this.searchFeatures(this._input.value);
        }
    },

    hidePanel: function (e) {
        if (this.isPanelVisible()) {
            L.DomUtil.removeClass(this._panel, 'visible');
            L.DomUtil.removeClass(this._input, 'visible');
            L.DomUtil.removeClass(this._closeButton, 'visible');
            L.DomUtil.removeClass(this._resultList, 'visible');
            // Move back the map centre - only if we still hold this._map
            // as this might already have been cleared up by removeFrom()
            if (null !== this._map) {
                this._map.panBy([this.getOffset() * -0.5, 0], {duration: 0.5});
            };
            this.fire('hide');
            if(e) {
                L.DomEvent.stopPropagation(e);
            }
        }
    },
    
    getOffset: function() {
        if (this._panelOnLeftSide) {
            return - this.options.panelWidth;
        } else {
            return this.options.panelWidth;
        }
    },

    indexFeatures: function(jsonFeatures, keys) {

        this._keys = keys;
        var properties = jsonFeatures.map(function(feature) {
            // Keep track of the original feature
            feature.properties._feature = feature;
            return feature.properties;
        });
        
        var options = {
            keys: keys,
            caseSensitive: this.options.caseSensitive,
            threshold : this.options.threshold
        };
        
        this._fuseIndex = new Fuse(properties, options);
    },
    
    searchFeatures: function(string) {
        
        var result = this._fuseIndex.search(string);

        // Empty result list
        $(".result-item").remove();

        var resultList = $('.result-list')[0];
        var num = 0;
        var max = this.options.maxResultLength;
        for (var i in result) {
            var props = result[i];
            var feature = props._feature;
            
            if (!this.options.showInvisibleFeatures) {
                this.createResultItem(props, resultList);
                if (undefined !== max && ++num === max)
                    break;
            }
        }
    },

    createResultItem: function(props, container) {

        var _this = this;
        var feature = props._feature;

        // Create a container and open the associated popup on click
        var resultItem = L.DomUtil.create('p', 'result-item', container);
        
        L.DomUtil.addClass(resultItem, 'clickable');
        resultItem.onclick = function() {
            _this.hidePanel();
            map.fitBounds(feature.layer.getBounds(), {'duration': 0.95});
            feature.layer.openPopup();
        };

        // Fill in the container with the user-supplied function if any,
        // otherwise display the feature properties used for the search.
        if (null !== this.options.showResultFct) {
            this.options.showResultFct(feature, resultItem);
        } else {
            str = '<b>' + props[this._keys[0]] + '</b>';
            for (var i = 1; i < this._keys.length; i++) {
                str += '<br/>' + props[this._keys[i]];
            }
            resultItem.innerHTML = str;
        };

        return resultItem;
    }
});

L.control.fuseSearch = function(options) {
    return new L.Control.FuseSearch(options);
};