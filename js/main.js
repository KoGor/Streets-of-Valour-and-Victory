var map = L.map('map').setView([55.743, 37.62], 11);
var tileLayer = L.tileLayer.grayscale('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data © <a href="http://www.openstreetmap.org/copyright">Openstreetmap</a> contributors',
            maxZoom: 18,
            minZoom: 11,
            maxBounds: [[55.123, 36.800], [56.200, 38.430]]
        });
tileLayer.addTo(map);

var streetsLayer = L.geoJson(streetsData.features, {
    style: function (feature) {
        var zoom = map.getZoom(),
            style = streetsStyle[zoom];
        return style[feature.properties.stylegroup];
    },
    onEachFeature: function (feature, layer) {
        feature.layer = layer;
           layer.bindPopup('Название: ' + '<a href="' + feature.properties.st_wiki + '" target="_blank" class="map-popup-link">' + feature.properties.name + '</a> </br>'
                  + 'Память: ' + '<a href="' + feature.properties.hero_wiki + '" target="_blank" class="map-popup-link">' + feature.properties.memory + '</a>');
    }
});

map.on('zoomend', function() {
    streetsLayer.setStyle(function (feature) {
        var zoom = map.getZoom(),
            style = streetsStyle[zoom];
        return style[feature.properties.stylegroup];
    });
});

// Hack for forcing tiles redraw
tileLayer.on('load', function() {
    map.panBy([1, 0]);
});

// Add fuse search control
var options = {
    position: 'topright',
    title: 'Chercher',
    placeholder: 'Улицы и Герои',
    maxResultLength: 7,
    threshold: 0.2,
    showInvisibleFeatures: false,
    showResultFct: function(feature, container) {
        var props = feature.properties,
            name = L.DomUtil.create('b', null, container);
        name.innerHTML = props.name;

        container.appendChild(L.DomUtil.create('br', null, container));
        container.appendChild(document.createTextNode(props.memory));
    }
};

var fuseSearchCtrl = L.control.fuseSearch(options);
fuseSearchCtrl.indexFeatures(streetsData.features, ['name', 'memory']);
map.addControl(fuseSearchCtrl);

streetsLayer.addTo(map);