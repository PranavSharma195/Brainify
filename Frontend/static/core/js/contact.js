var DEST_LAT=27.71420, DEST_LNG=85.31780;
var map, userMarker, routeLine, currentLayer;

var TILES={
  street:     'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite:  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  dark:       'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
};
var ATTRIB={
  street:    '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  satellite: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
  dark:      '© OpenStreetMap contributors © CARTO'
};

var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
var activeLayer = isDark ? 'dark' : 'street';

map = L.map('leaflet-map', {zoomControl:true}).setView([DEST_LAT, DEST_LNG], 18);
currentLayer = L.tileLayer(TILES[activeLayer], {attribution:ATTRIB[activeLayer], maxZoom:20}).addTo(map);

// Pulsing destination marker
var destIcon = L.divIcon({
  html: '<div style="position:relative;width:20px;height:20px">'+
        '<div style="position:absolute;width:20px;height:20px;border-radius:50%;background:rgba(238,85,85,.35);animation:pulse-ring 2s ease-out infinite"></div>'+
        '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:#EE5555;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>'+
        '</div>',
  iconSize:[20,20], iconAnchor:[10,10], className:''
});
var destMarker = L.marker([DEST_LAT, DEST_LNG], {icon:destIcon}).addTo(map);
destMarker.bindPopup(
  '<div style="font-size:13px;font-weight:700;margin-bottom:3px">Islington College</div>'+
  '<div style="font-size:11.5px;color:#666;line-height:1.5">'+
  '<span style="display:block">Kamalpokhari, Kathmandu, Nepal</span>'+
  '<span style="display:block;margin-top:4px">'+
  '<a href="https://www.openstreetmap.org/?mlat='+DEST_LAT+'&mlon='+DEST_LNG+'#map=18/'+DEST_LAT+'/'+DEST_LNG+'" target="_blank" '+
  'style="color:#2C6EE0;font-weight:600;text-decoration:none">Open in OpenStreetMap ↗</a></span></div>',
  {maxWidth:220}
).openPopup();

function setLayer(name){
  var dark = document.documentElement.getAttribute('data-theme') === 'dark';
  var target = (!dark && name) ? name : 'dark';
  if(currentLayer) map.removeLayer(currentLayer);
  currentLayer = L.tileLayer(TILES[target], {attribution:ATTRIB[target], maxZoom:20}).addTo(map);
  // Re-add markers on top
  destMarker.addTo(map);
  if(userMarker) userMarker.addTo(map);
  if(routeLine) routeLine.addTo(map);
  // Update button states (only relevant in light)
  document.getElementById('lsw-street').classList.toggle('on', name==='street');
  document.getElementById('lsw-sat').classList.toggle('on', name==='satellite');
  activeLayer = target;
}

function pickType(el){
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('msg_type').value=el.dataset.v;
}

function showRoute(){
  var btn=document.getElementById('locBtn');
  var ico=document.getElementById('locIco');
  var txt=document.getElementById('locTxt');
  var errEl=document.getElementById('locErr');
  errEl.style.display='none';

  if(!navigator.geolocation){
    errEl.textContent='Geolocation not supported by your browser.';
    errEl.style.display='block';
    return;
  }

  btn.disabled=true;
  ico.textContent='hourglass_empty';
  txt.textContent='Getting your location…';

  navigator.geolocation.getCurrentPosition(function(pos){
    var lat=pos.coords.latitude, lng=pos.coords.longitude;

    // Remove old user marker and route
    if(userMarker) map.removeLayer(userMarker);
    if(routeLine) map.removeLayer(routeLine);

    // User location marker
    var userIcon=L.divIcon({
      html:'<div style="width:14px;height:14px;background:#3B6EF0;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',
      iconSize:[14,14],iconAnchor:[7,7],className:''
    });
    userMarker=L.marker([lat,lng],{icon:userIcon}).addTo(map);
    userMarker.bindPopup('<b>Your location</b>').openPopup();

    // Draw straight line between user and destination
    routeLine=L.polyline([[lat,lng],[DEST_LAT,DEST_LNG]],{
      color:'#3B6EF0',weight:3,opacity:.85,dashArray:'8,6'
    }).addTo(map);

    // Fit map to show both points
    map.fitBounds([[lat,lng],[DEST_LAT,DEST_LNG]],{padding:[40,40]});

    // Fetch real route from OSRM (free, no API key)
    fetch('https://router.project-osrm.org/route/v1/driving/'+lng+','+lat+';'+DEST_LNG+','+DEST_LAT+'?overview=full&geometries=geojson')
      .then(function(r){return r.json();})
      .then(function(data){
        if(data.routes && data.routes[0]){
          // Remove straight line, draw real route
          map.removeLayer(routeLine);
          var coords=data.routes[0].geometry.coordinates.map(function(c){return [c[1],c[0]];});
          routeLine=L.polyline(coords,{color:'#3B6EF0',weight:4,opacity:.9}).addTo(map);
          map.fitBounds(routeLine.getBounds(),{padding:[40,40]});

          var dist=(data.routes[0].distance/1000).toFixed(1);
          var mins=Math.round(data.routes[0].duration/60);
          document.getElementById('routeInfo').textContent='~'+dist+' km · ~'+mins+' min drive to Islington College';
        }
      }).catch(function(){
        // OSRM failed — straight line is already shown, that's fine
        var dist=Math.round(Math.sqrt(Math.pow((lat-DEST_LAT)*111,2)+Math.pow((lng-DEST_LNG)*111*Math.cos(DEST_LAT*Math.PI/180),2))*10)/10;
        document.getElementById('routeInfo').textContent='~'+dist+' km from your location (straight line)';
      });

    btn.classList.add('done');
    btn.disabled=false;
    ico.textContent='check_circle';
    txt.textContent='Route shown on map';

    var bar=document.getElementById('routeBar');
    bar.classList.add('show');
    var dist=Math.round(Math.sqrt(Math.pow((lat-DEST_LAT)*111,2)+Math.pow((lng-DEST_LNG)*111*Math.cos(DEST_LAT*Math.PI/180),2))*10)/10;
    document.getElementById('routeInfo').textContent='~'+dist+' km — loading route…';
    document.getElementById('mapsLink').href='https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route='+lat.toFixed(5)+'%2C'+lng.toFixed(5)+';'+DEST_LAT+'%2C'+DEST_LNG;

  },function(err){
    btn.disabled=false;
    ico.textContent='location_off';
    txt.textContent='Location denied';
    errEl.style.display='block';
    if(err.code===1) errEl.textContent='Location access denied — please allow location in browser settings.';
    else if(err.code===2) errEl.textContent='Location unavailable. Please try again.';
    else errEl.textContent='Timed out. Please try again.';
  },{timeout:12000,enableHighAccuracy:true});
}

// Update tile when theme changes
document.querySelectorAll('.at').forEach(function(el){
  el.addEventListener('click',function(){
    setTimeout(function(){
      var dark=document.documentElement.getAttribute('data-theme')==='dark';
      if(currentLayer) map.removeLayer(currentLayer);
      var url=dark ? TILES.dark : (activeLayer==='satellite' ? TILES.satellite : TILES.street);
      var att=dark ? ATTRIB.dark : (activeLayer==='satellite' ? ATTRIB.satellite : ATTRIB.street);
      currentLayer=L.tileLayer(url,{attribution:att,maxZoom:20}).addTo(map);
      destMarker.addTo(map);
      if(userMarker) userMarker.addTo(map);
      if(routeLine) routeLine.addTo(map);
      // Hide layer switcher in dark mode (no choice needed)
      document.querySelector('.layer-sw').style.display=dark?'none':'flex';
    },100);
  });
});
// Initial visibility of layer switcher
document.querySelector('.layer-sw').style.display=(document.documentElement.getAttribute('data-theme')==='dark')?'none':'flex';
