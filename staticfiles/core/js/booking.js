// ── Country definitions ──
var COUNTRIES = {
  nepal:      {name:'Nepal',      center:[28.3,84.5],    zoom:7,  flag:'🇳🇵', osmId:184633},
  india:      {name:'India',      center:[22.5,82.0],    zoom:5,  flag:'🇮🇳', osmId:304716},
  bangladesh: {name:'Bangladesh', center:[23.8,90.3],    zoom:7,  flag:'🇧🇩', osmId:184640},
  srilanka:   {name:'Sri Lanka',  center:[7.8,80.7],     zoom:8,  flag:'🇱🇰', osmId:536807},
  thailand:   {name:'Thailand',   center:[15.0,101.0],   zoom:6,  flag:'🇹🇭', osmId:2067731},
  malaysia:   {name:'Malaysia',   center:[4.0,109.5],    zoom:6,  flag:'🇲🇾', osmId:2108121},
  singapore:  {name:'Singapore',  center:[1.35,103.82],  zoom:12, flag:'🇸🇬', osmId:536780},
  southkorea: {name:'South Korea',center:[36.0,127.8],   zoom:7,  flag:'🇰🇷', osmId:307756}
};

// ── Hospitals per country ──
var ALL_HOSPITALS = {
nepal: [
  {name:"Grande International Hospital",type:"Multi-Specialty / Neuro",lat:27.6899,lng:85.3186,addr:"Tokha Rd, Dhapasi, Kathmandu",phone:"+977-1-5159266",spec:"Neurosurgery, Brain Tumor, Radiology, MRI",hours:"24/7 Emergency & OPD"},
  {name:"B&B Hospital",type:"Neuro / Cancer Centre",lat:27.6818,lng:85.3425,addr:"Gwarko, Lalitpur",phone:"+977-1-5531933",spec:"Neuro-oncology, Brain Surgery, MRI, CT",hours:"24/7 Emergency, OPD Sun–Fri 8AM–5PM"},
  {name:"Nepal Mediciti Hospital",type:"Multi-Specialty / Neuro",lat:27.6631,lng:85.3241,addr:"Bhaisepati, Lalitpur",phone:"+977-1-4217766",spec:"Neurosurgery, Neuro-oncology, Advanced Imaging",hours:"24/7 Emergency & OPD"},
  {name:"Bir Hospital (NAMS)",type:"Government / Neuro",lat:27.7045,lng:85.3147,addr:"Mahaboudha, Kathmandu",phone:"+977-1-4221988",spec:"Neurosurgery, Brain Tumor, CT, MRI",hours:"24/7 Emergency, OPD Sun–Fri 10AM–2PM"},
  {name:"TU Teaching Hospital (TUTH)",type:"University / Neuro",lat:27.7361,lng:85.3298,addr:"Maharajgunj, Kathmandu",phone:"+977-1-4412303",spec:"Neurosurgery, Neuropathology, Brain Tumor",hours:"24/7 Emergency, OPD Sun–Fri 10AM–1PM"},
  {name:"Upendra Devkota Memorial – NIC",type:"Neuro-specialty",lat:27.7345,lng:85.3252,addr:"Bansbari, Kathmandu",phone:"+977-1-4370207",spec:"Neurosurgery, Brain Tumor, Epilepsy Surgery",hours:"24/7 Emergency & OPD"},
  {name:"Norvic International Hospital",type:"Multi-Specialty / Neuro",lat:27.6926,lng:85.3200,addr:"Thapathali, Kathmandu",phone:"+977-1-4258554",spec:"Neurology, Neurosurgery, Brain Imaging",hours:"24/7 Emergency, OPD Sun–Fri 8AM–5PM"},
  {name:"Annapurna Neurological Institute",type:"Neuro-specialty",lat:27.6840,lng:85.3478,addr:"Maitighar, Kathmandu",phone:"+977-1-4259595",spec:"Neurosurgery, Brain & Spine Tumor, EEG",hours:"24/7 Emergency & OPD"},
  {name:"Manipal Teaching Hospital",type:"University / Neuro",lat:28.2164,lng:83.9856,addr:"Phulbari, Pokhara",phone:"+977-61-526416",spec:"Neurosurgery, Brain Tumor, MRI, CT",hours:"24/7 Emergency, OPD Sun–Fri 9AM–4PM"},
  {name:"Gandaki Medical College",type:"Teaching / Neuro",lat:28.2290,lng:83.9870,addr:"Lekhnath Rd, Pokhara",phone:"+977-61-538595",spec:"Neurology, Neurosurgery, Brain Imaging",hours:"24/7 Emergency, OPD Sun–Fri 9AM–3PM"},
  {name:"Neuro Hospital Biratnagar",type:"Neuro-specialty",lat:26.4525,lng:87.2718,addr:"Rani, Biratnagar",phone:"+977-21-471544",spec:"Neurosurgery, Brain Tumor, Spine, MRI",hours:"24/7 Emergency, OPD Sun–Fri 9AM–5PM"},
  {name:"BP Koirala Institute of Health Sciences",type:"Government / Neuro",lat:26.8146,lng:87.2883,addr:"Ghopa, Dharan",phone:"+977-25-525555",spec:"Neurosurgery, Neuro-oncology, MRI, CT",hours:"24/7 Emergency, OPD Sun–Fri 9AM–1PM"},
  {name:"Chitwan Medical College",type:"Teaching / Neuro",lat:27.5882,lng:84.3630,addr:"Bharatpur, Chitwan",phone:"+977-56-524345",spec:"Neurology, Neurosurgery, Brain Tumor",hours:"24/7 Emergency, OPD Sun–Fri"},
  {name:"Bheri Hospital",type:"Government Zonal",lat:28.0986,lng:81.6184,addr:"Nepalgunj, Banke",phone:"+977-81-520200",spec:"Neurology, General Neuro, CT",hours:"24/7 Emergency, OPD Sun–Fri"},
  {name:"Seti Provincial Hospital",type:"Government / Neuro",lat:28.7041,lng:80.5933,addr:"Dhangadhi, Kailali",phone:"+977-91-521266",spec:"Neurology, Neurosurgery referral, CT",hours:"24/7 Emergency"}
],
india: [
  {name:"AIIMS New Delhi",type:"Government / Neuro",lat:28.5672,lng:77.2100,addr:"Ansari Nagar, New Delhi",phone:"+91-11-26588500",spec:"Neurosurgery, Neuro-oncology, Brain Tumor, MRI",hours:"24/7 Emergency, OPD Mon–Sat 8AM–1PM"},
  {name:"NIMHANS Bangalore",type:"Neuro-specialty Institute",lat:12.9429,lng:77.5939,addr:"Hosur Road, Bangalore",phone:"+91-80-26995000",spec:"Neurosurgery, Neuro-oncology, Epilepsy, EEG",hours:"24/7 Emergency & OPD"},
  {name:"Tata Memorial Hospital",type:"Cancer / Neuro-oncology",lat:19.0048,lng:72.8435,addr:"Dr E Borges Rd, Parel, Mumbai",phone:"+91-22-24177000",spec:"Neuro-oncology, Brain Tumor, Radiation, Chemo",hours:"24/7 Emergency, OPD Mon–Sat 8AM–4PM"},
  {name:"CMC Vellore – Neurosciences",type:"University / Neuro",lat:12.9249,lng:79.1325,addr:"Ida Scudder Road, Vellore",phone:"+91-416-2281000",spec:"Neurosurgery, Brain Tumor, Spine, MRI",hours:"24/7 Emergency, OPD Mon–Fri 8AM–4PM"},
  {name:"SCTIMST Trivandrum",type:"Government / Neuro",lat:8.5234,lng:76.9115,addr:"Medical College PO, Trivandrum",phone:"+91-471-2524000",spec:"Neurosurgery, Brain Imaging, Neuro-oncology",hours:"24/7 Emergency & OPD"},
  {name:"Medanta – The Medicity",type:"Multi-Specialty / Neuro",lat:28.4420,lng:77.0400,addr:"Sector 38, Gurugram, Haryana",phone:"+91-124-4141414",spec:"Neurosurgery, Brain Tumor, Gamma Knife, MRI",hours:"24/7 Emergency & OPD"},
  {name:"Fortis Memorial Research Institute",type:"Multi-Specialty / Neuro",lat:28.4440,lng:77.0421,addr:"Sector 44, Gurugram",phone:"+91-124-4962200",spec:"Neurosurgery, Brain & Spine Tumor, CyberKnife",hours:"24/7 Emergency & OPD"},
  {name:"Apollo Hospitals Chennai",type:"Multi-Specialty / Neuro",lat:13.0068,lng:80.2544,addr:"Greams Road, Chennai",phone:"+91-44-28290200",spec:"Neurosurgery, Brain Tumor, Advanced Imaging",hours:"24/7 Emergency & OPD"},
  {name:"Manipal Hospital Bangalore",type:"Multi-Specialty / Neuro",lat:12.9584,lng:77.6484,addr:"HAL Airport Rd, Bangalore",phone:"+91-80-25024444",spec:"Neurosurgery, Neuro-oncology, MRI, CT",hours:"24/7 Emergency & OPD"},
  {name:"PGIMER Chandigarh",type:"Government / Neuro",lat:30.7644,lng:76.7776,addr:"Sector 12, Chandigarh",phone:"+91-172-2747585",spec:"Neurosurgery, Brain Tumor, Neuro-oncology",hours:"24/7 Emergency, OPD Mon–Sat"}
],
bangladesh: [
  {name:"National Institute of Neurosciences (NINS)",type:"Neuro-specialty",lat:23.7515,lng:90.3743,addr:"Sher-E-Bangla Nagar, Dhaka",phone:"+880-2-48116919",spec:"Neurosurgery, Brain Tumor, Epilepsy, EEG",hours:"24/7 Emergency & OPD"},
  {name:"Bangabandhu Sheikh Mujib Medical University",type:"University / Neuro",lat:23.7395,lng:90.3960,addr:"Shahbagh, Dhaka",phone:"+880-2-58614001",spec:"Neurosurgery, Neuro-oncology, MRI",hours:"24/7 Emergency, OPD Sun–Thu 8AM–2PM"},
  {name:"Dhaka Medical College Hospital",type:"Government / Neuro",lat:23.7260,lng:90.3985,addr:"Secretariat Rd, Dhaka",phone:"+880-2-55165701",spec:"Neurosurgery, Brain Tumor, CT, MRI",hours:"24/7 Emergency, OPD Sun–Thu"},
  {name:"Square Hospital",type:"Multi-Specialty / Neuro",lat:23.7512,lng:90.3826,addr:"18/F Bir Uttam Qazi Nuruzzaman Rd, Dhaka",phone:"+880-2-8159457",spec:"Neurosurgery, Brain Imaging, Neuro-oncology",hours:"24/7 Emergency & OPD"},
  {name:"Evercare Hospital Dhaka",type:"Multi-Specialty / Neuro",lat:23.8130,lng:90.4235,addr:"Plot 81, Block E, Bashundhara, Dhaka",phone:"+880-2-55067777",spec:"Neurosurgery, Brain Tumor, Advanced MRI",hours:"24/7 Emergency & OPD"},
  {name:"United Hospital",type:"Multi-Specialty / Neuro",lat:23.7943,lng:90.4142,addr:"Plot 15, Rd 71, Gulshan, Dhaka",phone:"+880-2-58416132",spec:"Neurology, Neurosurgery, Brain Imaging",hours:"24/7 Emergency & OPD"}
],
srilanka: [
  {name:"National Hospital of Sri Lanka",type:"Government / Neuro",lat:6.9175,lng:79.8614,addr:"Regent St, Colombo 10",phone:"+94-11-2691111",spec:"Neurosurgery, Brain Tumor, CT, MRI",hours:"24/7 Emergency, OPD Mon–Fri 8AM–12PM"},
  {name:"Lanka Hospitals",type:"Multi-Specialty / Neuro",lat:6.8862,lng:79.8649,addr:"578 Elvitigala Mawatha, Colombo 5",phone:"+94-11-5530000",spec:"Neurosurgery, Brain Tumor, Advanced Imaging",hours:"24/7 Emergency & OPD"},
  {name:"Asiri Central Hospital",type:"Multi-Specialty / Neuro",lat:6.8948,lng:79.8574,addr:"114 Norris Canal Rd, Colombo 10",phone:"+94-11-4660000",spec:"Neurosurgery, Neuro-oncology, MRI",hours:"24/7 Emergency & OPD"},
  {name:"Teaching Hospital Kandy",type:"Government / Neuro",lat:7.2906,lng:80.6337,addr:"Kandy",phone:"+94-81-2222261",spec:"Neurosurgery, Brain Tumor, CT",hours:"24/7 Emergency, OPD Mon–Fri"},
  {name:"Teaching Hospital Karapitiya",type:"Government / Neuro",lat:6.0535,lng:80.2210,addr:"Karapitiya, Galle",phone:"+94-91-2232278",spec:"Neurosurgery, Brain Imaging",hours:"24/7 Emergency"}
],
thailand: [
  {name:"Bumrungrad International Hospital",type:"Multi-Specialty / Neuro",lat:13.7443,lng:100.5517,addr:"33 Soi 3, Sukhumvit, Bangkok",phone:"+66-2-066-8888",spec:"Neurosurgery, Brain Tumor, Gamma Knife, MRI",hours:"24/7 Emergency & OPD"},
  {name:"Siriraj Hospital",type:"University / Neuro",lat:13.7590,lng:100.4862,addr:"2 Wang Lang Rd, Bangkok Noi",phone:"+66-2-419-7000",spec:"Neurosurgery, Neuro-oncology, Brain Tumor",hours:"24/7 Emergency, OPD Mon–Fri 8AM–4PM"},
  {name:"King Chulalongkorn Memorial Hospital",type:"University / Neuro",lat:13.7308,lng:100.5341,addr:"1873 Rama IV Rd, Pathum Wan, Bangkok",phone:"+66-2-256-4000",spec:"Neurosurgery, Brain Tumor, EEG, MRI",hours:"24/7 Emergency, OPD Mon–Fri"},
  {name:"Ramathibodi Hospital",type:"University / Neuro",lat:13.7651,lng:100.5344,addr:"270 Rama VI Rd, Ratchathewi, Bangkok",phone:"+66-2-201-1000",spec:"Neurosurgery, Neuro-oncology, Imaging",hours:"24/7 Emergency & OPD"},
  {name:"Bangkok Hospital",type:"Multi-Specialty / Neuro",lat:13.7469,lng:100.5608,addr:"2 Soi 47, New Phetchaburi Rd, Bangkok",phone:"+66-2-310-3000",spec:"Neurosurgery, Brain Tumor, CyberKnife",hours:"24/7 Emergency & OPD"},
  {name:"Chiang Mai University Hospital",type:"University / Neuro",lat:18.7918,lng:98.9729,addr:"110 Inthawarorot Rd, Chiang Mai",phone:"+66-53-935-555",spec:"Neurosurgery, Brain Tumor, CT, MRI",hours:"24/7 Emergency, OPD Mon–Fri"}
],
malaysia: [
  {name:"Hospital Kuala Lumpur (HKL)",type:"Government / Neuro",lat:3.1714,lng:101.7028,addr:"Jalan Pahang, Kuala Lumpur",phone:"+60-3-2615-5555",spec:"Neurosurgery, Brain Tumor, MRI, CT",hours:"24/7 Emergency, OPD Mon–Fri 8AM–5PM"},
  {name:"University Malaya Medical Centre",type:"University / Neuro",lat:3.1138,lng:101.6530,addr:"Lembah Pantai, Kuala Lumpur",phone:"+60-3-7949-4422",spec:"Neurosurgery, Neuro-oncology, Advanced Imaging",hours:"24/7 Emergency & OPD"},
  {name:"Gleneagles Hospital KL",type:"Multi-Specialty / Neuro",lat:3.1586,lng:101.7398,addr:"286 Jalan Ampang, KL",phone:"+60-3-4141-3000",spec:"Neurosurgery, Brain Tumor, Gamma Knife",hours:"24/7 Emergency & OPD"},
  {name:"Sunway Medical Centre",type:"Multi-Specialty / Neuro",lat:3.0684,lng:101.6033,addr:"5 Jalan Lagoon Selatan, Bandar Sunway",phone:"+60-3-7491-9191",spec:"Neurosurgery, Brain Tumor, CyberKnife, MRI",hours:"24/7 Emergency & OPD"},
  {name:"Penang Hospital",type:"Government / Neuro",lat:5.4172,lng:100.3086,addr:"Jalan Residensi, George Town, Penang",phone:"+60-4-222-5333",spec:"Neurosurgery, Brain Tumor, CT",hours:"24/7 Emergency, OPD Mon–Fri"},
  {name:"Prince Court Medical Centre",type:"Multi-Specialty / Neuro",lat:3.1514,lng:101.7183,addr:"39 Jalan Kia Peng, KL",phone:"+60-3-2160-0000",spec:"Neurosurgery, Brain Imaging, Neuro-oncology",hours:"24/7 Emergency & OPD"}
],
singapore: [
  {name:"National Neuroscience Institute (NNI)",type:"Neuro-specialty",lat:1.2789,lng:103.8447,addr:"11 Jalan Tan Tock Seng, Singapore",phone:"+65-6357-7153",spec:"Neurosurgery, Brain Tumor, Neuro-oncology",hours:"24/7 Emergency, OPD Mon–Fri 8AM–5PM"},
  {name:"Singapore General Hospital – Neurosurgery",type:"Government / Neuro",lat:1.2793,lng:103.8354,addr:"Outram Rd, Singapore 169608",phone:"+65-6222-3322",spec:"Neurosurgery, Brain Tumor, Gamma Knife, MRI",hours:"24/7 Emergency & OPD"},
  {name:"National University Hospital (NUH)",type:"University / Neuro",lat:1.2936,lng:103.7830,addr:"5 Lower Kent Ridge Rd, Singapore",phone:"+65-6779-5555",spec:"Neurosurgery, Neuro-oncology, Advanced Imaging",hours:"24/7 Emergency & OPD"},
  {name:"Mount Elizabeth Hospital",type:"Multi-Specialty / Neuro",lat:1.3051,lng:103.8355,addr:"3 Mount Elizabeth, Singapore 228510",phone:"+65-6737-2666",spec:"Neurosurgery, Brain Tumor, CyberKnife",hours:"24/7 Emergency & OPD"},
  {name:"Gleneagles Hospital Singapore",type:"Multi-Specialty / Neuro",lat:1.3071,lng:103.8210,addr:"6A Napier Rd, Singapore 258500",phone:"+65-6473-7222",spec:"Neurosurgery, Brain Tumor, Imaging",hours:"24/7 Emergency & OPD"}
],
southkorea: [
  {name:"Seoul National University Hospital",type:"University / Neuro",lat:37.5796,lng:126.9990,addr:"101 Daehak-ro, Jongno-gu, Seoul",phone:"+82-2-2072-2114",spec:"Neurosurgery, Brain Tumor, Neuro-oncology, MRI",hours:"24/7 Emergency, OPD Mon–Fri 8AM–5PM"},
  {name:"Samsung Medical Center",type:"Multi-Specialty / Neuro",lat:37.4881,lng:127.0856,addr:"81 Irwon-ro, Gangnam-gu, Seoul",phone:"+82-2-3410-2114",spec:"Neurosurgery, Brain Tumor, Gamma Knife, Proton",hours:"24/7 Emergency & OPD"},
  {name:"Asan Medical Center",type:"Multi-Specialty / Neuro",lat:37.5261,lng:127.1080,addr:"88 Olympic-ro 43-gil, Songpa-gu, Seoul",phone:"+82-2-3010-3114",spec:"Neurosurgery, Brain Tumor, Radiosurgery, MRI",hours:"24/7 Emergency & OPD"},
  {name:"Severance Hospital (Yonsei)",type:"University / Neuro",lat:37.5627,lng:126.9411,addr:"50-1 Yonsei-ro, Seodaemun-gu, Seoul",phone:"+82-2-2228-0114",spec:"Neurosurgery, Brain Tumor, CyberKnife",hours:"24/7 Emergency, OPD Mon–Fri"},
  {name:"Seoul St. Mary's Hospital",type:"University / Neuro",lat:37.5016,lng:127.0045,addr:"222 Banpo-daero, Seocho-gu, Seoul",phone:"+82-2-1588-1511",spec:"Neurosurgery, Brain Tumor, Neuro-oncology",hours:"24/7 Emergency & OPD"},
  {name:"National Cancer Center Korea",type:"Cancer / Neuro-oncology",lat:37.3972,lng:127.0140,addr:"323 Ilsan-ro, Goyang-si, Gyeonggi",phone:"+82-31-920-0114",spec:"Neuro-oncology, Brain Tumor, Proton Therapy",hours:"OPD Mon–Fri 8AM–5PM"}
]
};

// ── Map setup — theme-aware tiles like Contact page ──
var TILES = {
  street:    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
};
var ATTRIB = {
  street:    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  satellite: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
  dark:      '&copy; OpenStreetMap contributors &copy; CARTO'
};

var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
var bkActiveLayer = isDark ? 'dark' : 'street';
var bkMap, bkCurrentTile, bkUserMarker, bkRouteLine, selectedHosp = null;
var currentCountry = 'nepal';
var activeHospitals = ALL_HOSPITALS[currentCountry];
var markers = [];
var clusterGroup = null;
var countryLayer = null;
var countryGeoCache = {};
var _allBorderLayers = []; // track every border layer ever added
var countryBorderStyle = {
  color: '#2C6EE0', weight: 3, opacity: 0.9,
  fillColor: '#2C6EE0', fillOpacity: 0.05,
  lineCap: 'round', lineJoin: 'round',
  interactive: false
};

bkMap = L.map('booking-map', {zoomControl: true}).setView(COUNTRIES.nepal.center, COUNTRIES.nepal.zoom);
bkCurrentTile = L.tileLayer(TILES[bkActiveLayer], {attribution: ATTRIB[bkActiveLayer], maxZoom: 19}).addTo(bkMap);

function loadMarkers() {
  // Remove old cluster group
  if (clusterGroup) { bkMap.removeLayer(clusterGroup); }
  markers = [];
  activeHospitals = ALL_HOSPITALS[currentCountry] || [];
  document.getElementById('hospCount').textContent = activeHospitals.length;
  // Create cluster group
  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 45,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 13,
    iconCreateFunction: function(cluster) {
      var count = cluster.getChildCount();
      var size = count < 5 ? 'small' : count < 10 ? 'medium' : 'large';
      return L.divIcon({
        html: '<div><span>' + count + '</span></div>',
        className: 'marker-cluster marker-cluster-' + size,
        iconSize: L.point(48, 48)
      });
    }
  });
  // Add markers to cluster
  activeHospitals.forEach(function(h, i) {
    var isNeuro = h.type.toLowerCase().indexOf('neuro') !== -1 || h.type.toLowerCase().indexOf('cancer') !== -1;
    var cls = isNeuro ? 'neuro' : 'general';
    var icon = L.divIcon({
      html: '<div class="hosp-marker"><div class="hosp-marker-ring ' + cls + '"></div><div class="hosp-marker-dot ' + cls + '"><span class="material-symbols-rounded">local_hospital</span></div></div>',
      iconSize: [44, 44], iconAnchor: [22, 22], className: ''
    });
    var m = L.marker([h.lat, h.lng], {icon: icon});
    m.on('click', function() { openPanel(i); });
    m.bindTooltip(h.name, {direction: 'top', offset: [0, -24], className: 'hosp-tip'});
    markers.push(m);
    clusterGroup.addLayer(m);
  });
  bkMap.addLayer(clusterGroup);
}
loadMarkers();
loadCountryBorder('nepal');

// Preload all other country borders in background (staggered to avoid throttle)
setTimeout(function(){
  var keys = Object.keys(COUNTRIES).filter(function(k){ return k !== 'nepal' && !countryGeoCache[k]; });
  keys.forEach(function(k, i){
    setTimeout(function(){ loadCountryBorder(k, true); }, i * 400);
  });
}, 600);

function _clearAllBorders() {
  _allBorderLayers.forEach(function(ly) { try { bkMap.removeLayer(ly); } catch(e){} });
  _allBorderLayers = [];
  countryLayer = null;
}

function _showBorder(geo) {
  _clearAllBorders();
  countryLayer = L.geoJSON(geo, {style: countryBorderStyle}).addTo(bkMap);
  _allBorderLayers.push(countryLayer);
  if (clusterGroup) clusterGroup.bringToFront();
}

function loadCountryBorder(key, bgOnly) {
  if (!bgOnly) _clearAllBorders();
  var c = COUNTRIES[key];
  if (!c || !c.osmId) return;

  // If cached, show immediately (unless background-only)
  if (countryGeoCache[key]) {
    if (!bgOnly) _showBorder(countryGeoCache[key]);
    return;
  }

  // Fetch border — race two sources, first valid response wins
  var done = false;

  function onGeo(geo) {
    if (done) return;
    done = true;
    countryGeoCache[key] = geo;
    if (currentCountry === key) {
      _showBorder(geo);
    }
  }

  fetch('https://polygons.openstreetmap.fr/get_geojson.py?id=' + c.osmId + '&params=0.02')
    .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(data) { if (data && data.type) onGeo(data); })
    .catch(function() {});

  fetch('https://nominatim.openstreetmap.org/lookup?osm_ids=R' + c.osmId + '&polygon_geojson=1&polygon_threshold=0.01&format=json', {
    headers: {'User-Agent': 'BrainifyApp/1.0'}
  })
    .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(data) { if (data && data[0] && data[0].geojson) onGeo(data[0].geojson); })
    .catch(function() {});
}
loadCountryBorder._reqId = 0;

function switchCountry(key) {
  currentCountry = key;
  var c = COUNTRIES[key];
  closePanel();
  clearRoute();
  _clearAllBorders();
  document.getElementById('bkTitle').textContent = 'Neuro Hospitals — ' + c.name;
  bkMap.setView(c.center, c.zoom);
  loadMarkers();
  loadCountryBorder(key);
}

// ── Dropdown: no extra JS listener needed — onchange is in HTML ──

// ── Panel controls ──
function openPanel(idx) {
  selectedHosp = activeHospitals[idx];
  document.getElementById('panelName').textContent = selectedHosp.name;
  document.getElementById('panelType').textContent = selectedHosp.type;
  document.getElementById('panelAddr').textContent = selectedHosp.addr;
  document.getElementById('panelPhone').innerHTML = '<a href="tel:' + selectedHosp.phone + '" style="color:var(--blue);text-decoration:none;font-weight:600">' + selectedHosp.phone + '</a>';
  document.getElementById('panelSpec').textContent = selectedHosp.spec;
  document.getElementById('panelHours').textContent = selectedHosp.hours;
  document.getElementById('panelCallTxt').textContent = 'Call ' + selectedHosp.phone;
  document.getElementById('panelOsmLink').href = 'https://www.openstreetmap.org/?mlat=' + selectedHosp.lat + '&mlon=' + selectedHosp.lng + '#map=17/' + selectedHosp.lat + '/' + selectedHosp.lng;
  document.getElementById('bkPanel').classList.add('open');
  bkMap.flyTo([selectedHosp.lat, selectedHosp.lng], 16, {duration: 0.8});
}

function closePanel() {
  document.getElementById('bkPanel').classList.remove('open');
  selectedHosp = null;
}

function backToOverview() {
  closePanel();
  clearRoute();
  var c = COUNTRIES[currentCountry];
  bkMap.flyTo(c.center, c.zoom, {duration: 0.8});
}

function callHospital() {
  if (selectedHosp) window.location.href = 'tel:' + selectedHosp.phone;
}

// ── Route ──
function showRouteToSelected() {
  if (!selectedHosp) return;
  var btn = document.getElementById('panelRouteBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span>Getting location…';

  if (!navigator.geolocation) {
    btn.innerHTML = '<span class="material-symbols-rounded">location_off</span>Geolocation not supported';
    btn.disabled = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(function(pos) {
    var lat = pos.coords.latitude, lng = pos.coords.longitude;
    clearRoute();

    // User marker
    var userIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;background:#3B6EF0;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',
      iconSize: [14, 14], iconAnchor: [7, 7], className: ''
    });
    bkUserMarker = L.marker([lat, lng], {icon: userIcon}).addTo(bkMap);
    bkUserMarker.bindPopup('<b>Your location</b>').openPopup();

    // Straight line first
    bkRouteLine = L.polyline([[lat, lng], [selectedHosp.lat, selectedHosp.lng]], {
      color: '#3B6EF0', weight: 3, opacity: .85, dashArray: '8,6'
    }).addTo(bkMap);
    bkMap.fitBounds([[lat, lng], [selectedHosp.lat, selectedHosp.lng]], {padding: [60, 60]});

    // Route bar
    var dist = Math.round(Math.sqrt(Math.pow((lat - selectedHosp.lat) * 111, 2) + Math.pow((lng - selectedHosp.lng) * 111 * Math.cos(selectedHosp.lat * Math.PI / 180), 2)) * 10) / 10;
    document.getElementById('bkRouteInfo').textContent = '~' + dist + ' km — loading route…';
    document.getElementById('bkMapsLink').href = 'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=' + lat.toFixed(5) + '%2C' + lng.toFixed(5) + ';' + selectedHosp.lat + '%2C' + selectedHosp.lng;
    document.getElementById('bkRouteBar').classList.add('show');

    // OSRM real route
    fetch('https://router.project-osrm.org/route/v1/driving/' + lng + ',' + lat + ';' + selectedHosp.lng + ',' + selectedHosp.lat + '?overview=full&geometries=geojson')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.routes && data.routes[0]) {
          bkMap.removeLayer(bkRouteLine);
          var coords = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
          bkRouteLine = L.polyline(coords, {color: '#3B6EF0', weight: 4, opacity: .9}).addTo(bkMap);
          bkMap.fitBounds(bkRouteLine.getBounds(), {padding: [60, 60]});
          var d = (data.routes[0].distance / 1000).toFixed(1);
          var m = Math.round(data.routes[0].duration / 60);
          document.getElementById('bkRouteInfo').textContent = '~' + d + ' km · ~' + m + ' min drive to ' + selectedHosp.name;
        }
      }).catch(function() {});

    btn.innerHTML = '<span class="material-symbols-rounded">check_circle</span>Route shown on map';
    btn.disabled = false;
  }, function(err) {
    btn.disabled = false;
    if (err.code === 1) btn.innerHTML = '<span class="material-symbols-rounded">location_off</span>Location denied';
    else btn.innerHTML = '<span class="material-symbols-rounded">error</span>Location error — try again';
    setTimeout(function() { btn.innerHTML = '<span class="material-symbols-rounded">directions</span>Show Route from My Location'; }, 3000);
  }, {timeout: 12000, enableHighAccuracy: true});
}

function clearRoute() {
  if (bkUserMarker) { bkMap.removeLayer(bkUserMarker); bkUserMarker = null; }
  if (bkRouteLine) { bkMap.removeLayer(bkRouteLine); bkRouteLine = null; }
  document.getElementById('bkRouteBar').classList.remove('show');
}

// ── Layer switching — theme-aware like Contact page ──
function bkSetLayer(name) {
  var dark = document.documentElement.getAttribute('data-theme') === 'dark';
  // In dark mode, always use dark tiles; in light mode, use selected layer
  var target = dark ? 'dark' : (name || 'street');
  if (bkCurrentTile) bkMap.removeLayer(bkCurrentTile);
  bkCurrentTile = L.tileLayer(TILES[target], {attribution: ATTRIB[target], maxZoom: 19}).addTo(bkMap);
  if (clusterGroup) clusterGroup.addTo(bkMap);
  if (bkUserMarker) bkUserMarker.addTo(bkMap);
  if (bkRouteLine) bkRouteLine.addTo(bkMap);
  if (countryLayer) countryLayer.addTo(bkMap);
  document.getElementById('bk-street').classList.toggle('on', name === 'street');
  document.getElementById('bk-sat').classList.toggle('on', name === 'satellite');
  bkActiveLayer = name || 'street';
}

// Theme change listener — sync map tiles with app theme
document.querySelectorAll('.theme-opt,.at').forEach(function(el) {
  el.addEventListener('click', function() {
    setTimeout(function() {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (bkCurrentTile) bkMap.removeLayer(bkCurrentTile);
      var target = dark ? 'dark' : (bkActiveLayer === 'satellite' ? 'satellite' : 'street');
      bkCurrentTile = L.tileLayer(TILES[target], {attribution: ATTRIB[target], maxZoom: 19}).addTo(bkMap);
      if (clusterGroup) clusterGroup.addTo(bkMap);
      if (bkUserMarker) bkUserMarker.addTo(bkMap);
      if (bkRouteLine) bkRouteLine.addTo(bkMap);
      if (countryLayer) countryLayer.addTo(bkMap);
      // Hide layer switcher in dark mode
      var lsw = document.getElementById('bkLsw');
      lsw.style.display = dark ? 'none' : 'flex';
    }, 100);
  });
});
// Initial layer switcher visibility
var _bkIsDark = document.documentElement.getAttribute('data-theme') === 'dark';
document.getElementById('bkLsw').style.display = _bkIsDark ? 'none' : 'flex';
