var map = L.map('map').setView([55.743, 37.62], 11);
    L.tileLayer.grayscale('http://tiles.maps.sputnik.ru/{z}/{x}/{y}.png', {
            attribution: ' © <a href="http://sputnik.ru">Спутник</a> | © <a href="http://www.openstreetmap.org/copyright">Openstreetmap</a>',
            maxZoom: 18,
            minZoom: 11,
            maxBounds: [[55.123, 36.800], [56.200, 38.430]]
        }).addTo(map);

var streetsLayer = L.geoJson(streetsData.features, {
    style: function (feature) {
        var zoom = map.getZoom(),
            style = streetsStyle[zoom];
        return style[feature.properties.stylegroup];
    },
    onEachFeature: function (feature, layer) {
        //console.log(feature);
        feature.layer = layer;
        //console.log(layer);
        //console.log(feature);
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
    // Add fuse search control
    var options = {
        position: 'topright',
        title: 'Chercher',
        placeholder: 'Улицы и Герои',
        maxResultLength: 7,
        threshold: 0.2,
        showInvisibleFeatures: false,
        showResultFct: function(feature, container) {
            var props = feature.properties;
            var name = L.DomUtil.create('b', null, container);
            name.innerHTML = props.name;

            container.appendChild(L.DomUtil.create('br', null, container));

            container.appendChild(document.createTextNode(props.memory));
        }
    };
    var fuseSearchCtrl = L.control.fuseSearch(options);
    map.addControl(fuseSearchCtrl);
fuseSearchCtrl.indexFeatures(streetsData.features, ['name', 'memory']);

streetsLayer.addTo(map);