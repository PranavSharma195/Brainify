// COMPLETE FIXED - Bulk upload with ALL patient fields + scrollable UI for 50 files

let selectedFile = null;
let bulkFiles = [];
let bulkMode = 'single';
const MAX_BULK_FILES = 50;

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Switch between single and bulk upload modes
function switchUploadMode(mode) {
  bulkMode = mode;

  // Toggle class on <main> — CSS uses !important so bfcache can't override
  var mainEl = document.querySelector('main.main');
  if (mainEl) {
    mainEl.classList.toggle('mode-single', mode === 'single');
    mainEl.classList.toggle('mode-bulk',   mode === 'bulk');
  }

  // Also set inline styles as a second layer
  var singleDiv = document.getElementById('singleUploadMode');
  var bulkDiv   = document.getElementById('bulkUploadMode');
  if (mode === 'single') {
    if (singleDiv) singleDiv.style.display = 'grid';
    if (bulkDiv)   bulkDiv.style.display   = 'none';
  } else {
    if (singleDiv) singleDiv.style.display = 'none';
    if (bulkDiv)   bulkDiv.style.display   = 'flex';
  }

  var tabs = document.querySelectorAll('.upload-tab');
  tabs.forEach(function(tab) {
    tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
  });
}

// ── Reset helpers ──────────────────────────────────────────────

// Resets file selection state — buttons are always visible so no show/hide needed
function clearSingleFileState() {
  selectedFile = null;
  var fi = document.getElementById('fi');
  if (fi) fi.value = '';
  // Hide the file-info chip inside the dropbox
  var fiInfo = document.getElementById('fi-info');
  if (fiInfo) fiInfo.style.display = 'none';
  // Reset the big icon
  var dbIcon = document.getElementById('dbIcon');
  if (dbIcon) { dbIcon.style.color = ''; dbIcon.textContent = 'upload_file'; }
  // Remove green border
  var db = document.getElementById('db');
  if (db) db.classList.remove('got');
}

// Resets file + all patient form fields
function clearAllSingle() {
  clearSingleFileState();
  var fields = ['pname', 'pid', 'page', 'pnotes'];
  for (var i = 0; i < fields.length; i++) {
    var el = document.getElementById(fields[i]);
    if (el) el.value = '';
  }
  var pg = document.getElementById('pgender'); if (pg) pg.selectedIndex = 0;
  var st = document.getElementById('scantype'); if (st) st.selectedIndex = 0;
  var pr = document.getElementById('priority'); if (pr) pr.selectedIndex = 0;
}

function resetSingleUpload() { clearSingleFileState(); }

// ── Bulk reset helpers ──────────────────────────────────────────

// Clears bulk file state only (Re-upload: label opens picker natively)
function clearBulkFileState() {
  bulkFiles = [];
  var fiBulk = document.getElementById('fi-bulk');
  if (fiBulk) fiBulk.value = '';
  var fl = document.getElementById('bulk-files-list');    if (fl) fl.innerHTML = '';
  var pc = document.getElementById('bulk-patients-container'); if (pc) pc.innerHTML = '';
  var bulkSub = document.getElementById('bulk-sub');      if (bulkSub) bulkSub.style.display = 'none';
  // Hide count badge
  var countBadge = document.getElementById('bulk-loaded-count');
  if (countBadge) countBadge.style.display = 'none';
  if (bulkDropbox) {
    bulkDropbox.classList.remove('got');
    var icon = bulkDropbox.querySelector('.db-icon');
    if (icon) { icon.style.color = ''; icon.textContent = 'cloud_upload'; }
  }
}

// Same — bulk has no extra form fields to clear beyond the file list
function clearAllBulk() { clearBulkFileState(); }
function resetBulkUpload() { clearBulkFileState(); }

// Single upload handlers
var fileInput = document.getElementById('fi');
var dropbox = document.getElementById('db');

if (fileInput && dropbox) {
  fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
      selectedFile = e.target.files[0];
      setSingleFileSelected(selectedFile.name);
    }
  });

  dropbox.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropbox.classList.add('over');
  });

  dropbox.addEventListener('dragleave', function() {
    dropbox.classList.remove('over');
  });

  dropbox.addEventListener('drop', function(e) {
    e.preventDefault();
    dropbox.classList.remove('over');
    if (e.dataTransfer.files.length > 0) {
      selectedFile = e.dataTransfer.files[0];
      setSingleFileSelected(selectedFile.name);
    }
  });
}

function setSingleFileSelected(name) {
  // Green icon
  var dbIcon = document.getElementById('dbIcon');
  if (dbIcon) { dbIcon.style.color = '#1AD080'; dbIcon.textContent = 'check_circle'; }
  // File chip inside dropbox
  var fiInfo = document.getElementById('fi-info');
  var fiName = document.getElementById('fi-name');
  if (fiInfo) { if (fiName) fiName.textContent = name; fiInfo.style.display = 'flex'; }
  // Green border on dropbox
  var db = document.getElementById('db');
  if (db) db.classList.add('got');
}

// Bulk upload handlers
var bulkFileInput = document.getElementById('fi-bulk');
var bulkDropbox = document.getElementById('db-bulk');

if (bulkFileInput) {
  bulkFileInput.addEventListener('change', function(e) {
    handleBulkFiles(Array.from(e.target.files));
  });
}

if (bulkDropbox) {
  bulkDropbox.addEventListener('dragover', function(e) {
    e.preventDefault();
    bulkDropbox.classList.add('over');
  });
  
  bulkDropbox.addEventListener('dragleave', function() {
    bulkDropbox.classList.remove('over');
  });

  bulkDropbox.addEventListener('drop', function(e) {
    e.preventDefault();
    bulkDropbox.classList.remove('over');
    
    if (e.dataTransfer.files.length > 0) {
      handleBulkFiles(Array.from(e.dataTransfer.files));
    }
  });
}

function handleBulkFiles(files) {
  if (files.length < 2) {
    alert('Please select at least 2 files for bulk upload.');
    return;
  }
  if (files.length > MAX_BULK_FILES) {
    alert('Maximum ' + MAX_BULK_FILES + ' files allowed. You selected ' + files.length + ' files.');
    return;
  }
  bulkFiles = files;

  // Show the file count status inline
  var countBadge = document.getElementById('bulk-loaded-count');
  var countText  = document.getElementById('bulk-count-text');
  if (countBadge) countBadge.style.display = 'flex';
  if (countText)  countText.textContent = files.length + ' file' + (files.length !== 1 ? 's' : '') + ' selected';

  renderBulkFilesList();
  renderBulkPatientForms();

  var bulkSub = document.getElementById('bulk-sub');
  if (bulkSub) bulkSub.style.display = 'flex';
}

function renderBulkFilesList() {
  var container = document.getElementById('bulk-files-list');
  if (!container) return;
  
  var html = '';
  
  for (var i = 0; i < bulkFiles.length; i++) {
    var f = bulkFiles[i];
    var sizeMB = (f.size / 1024 / 1024).toFixed(2);
    
    html += '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--card2);border:1px solid var(--line);border-radius:10px;margin-top:8px">';
    html += '<div style="width:40px;height:40px;border-radius:8px;background:var(--as);border:1px solid var(--al);display:flex;align-items:center;justify-content:center;flex-shrink:0">';
    html += '<span class="material-symbols-rounded" style="font-size:20px;color:var(--blue)">description</span>';
    html += '</div>';
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-size:13px;font-weight:600;color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(f.name) + '</div>';
    html += '<div style="font-size:11px;color:var(--muted)">' + sizeMB + ' MB</div>';
    html += '</div>';
    html += '<button onclick="removeBulkFile(' + i + ')" style="width:32px;height:32px;border-radius:6px;background:transparent;border:1px solid var(--line);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">';
    html += '<span class="material-symbols-rounded" style="font-size:16px;color:var(--muted)">close</span>';
    html += '</button>';
    html += '</div>';
  }
  
  container.innerHTML = html;
}

function renderBulkPatientForms() {
  var container = document.getElementById('bulk-patients-container');
  if (!container) return;
  
  var html = '';
  
  for (var i = 0; i < bulkFiles.length; i++) {
    var f = bulkFiles[i];
    
    html += '<div class="card" style="margin-bottom:16px;padding:20px">';
    
    // Header with file number and name
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid var(--line)">';
    html += '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--blue) 0%,#38bdf8 100%);display:flex;align-items:center;justify-content:center;font-weight:800;color:white;font-size:16px;flex-shrink:0">' + (i + 1) + '</div>';
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-weight:700;font-size:14px;color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(f.name) + '</div>';
    html += '<div style="font-size:11px;color:var(--muted)">' + (f.size / 1024 / 1024).toFixed(2) + ' MB · ' + f.type + '</div>';
    html += '</div>';
    html += '</div>';
    
    // ALL PATIENT FIELDS (like single upload)
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">';
    
    // Patient Name (required)
    html += '<div class="fg">';
    html += '<label class="fl">Patient Name <span style="color:var(--red,#EE5555)">*</span></label>';
    html += '<div class="fi-wrap">';
    html += '<span class="fi-ico"><span class="material-symbols-rounded">person</span></span>';
    html += '<input type="text" class="fi bulk-pname" data-index="' + i + '" placeholder="e.g. John Doe" required>';
    html += '</div>';
    html += '</div>';
    
    // Patient ID
    html += '<div class="fg">';
    html += '<label class="fl">Patient ID</label>';
    html += '<div class="fi-wrap">';
    html += '<span class="fi-ico"><span class="material-symbols-rounded">badge</span></span>';
    html += '<input type="text" class="fi bulk-pid" data-index="' + i + '" placeholder="Auto-generated if blank">';
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    
    // Age and Gender row
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">';
    
    // Age
    html += '<div class="fg">';
    html += '<label class="fl">Age</label>';
    html += '<div class="fi-wrap">';
    html += '<span class="fi-ico"><span class="material-symbols-rounded">person_4</span></span>';
    html += '<input type="number" class="fi bulk-page" data-index="' + i + '" placeholder="e.g. 45" min="1" max="120">';
    html += '</div>';
    html += '</div>';
    
    // Gender
    html += '<div class="fg">';
    html += '<label class="fl">Gender</label>';
    html += '<div class="fs-wrap">';
    html += '<span class="fs-ico"><span class="material-symbols-rounded">wc</span></span>';
    html += '<select class="fs bulk-pgender" data-index="' + i + '">';
    html += '<option value="">Not specified</option>';
    html += '<option>Male</option>';
    html += '<option>Female</option>';
    html += '<option>Other</option>';
    html += '</select>';
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    
    // Scan Type and Priority row
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">';
    
    // Scan Type
    html += '<div class="fg">';
    html += '<label class="fl">Scan Type</label>';
    html += '<div class="fs-wrap">';
    html += '<span class="fs-ico"><span class="material-symbols-rounded">document_scanner</span></span>';
    html += '<select class="fs bulk-scantype" data-index="' + i + '">';
    html += '<option value="T1">T1-Weighted</option>';
    html += '<option value="T2">T2-Weighted</option>';
    html += '<option value="FLAIR">FLAIR</option>';
    html += '<option value="DWI">DWI</option>';
    html += '<option value="OTHER">Other</option>';
    html += '</select>';
    html += '</div>';
    html += '</div>';
    
    // Priority
    html += '<div class="fg">';
    html += '<label class="fl">Priority</label>';
    html += '<div class="fs-wrap">';
    html += '<span class="fs-ico"><span class="material-symbols-rounded">flag</span></span>';
    html += '<select class="fs bulk-priority" data-index="' + i + '">';
    html += '<option value="normal">Normal</option>';
    html += '<option value="high">High</option>';
    html += '<option value="urgent">Urgent</option>';
    html += '</select>';
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    
    // Clinical Notes
    html += '<div class="fg" style="margin-bottom:0">';
    html += '<label class="fl" style="display:flex;align-items:center;gap:5px">';
    html += '<span class="material-symbols-rounded" style="font-size:14px;color:var(--blue)">edit_note</span>';
    html += 'Clinical Notes';
    html += '</label>';
    html += '<textarea class="fi bulk-notes" data-index="' + i + '" style="padding:12px 14px;min-height:80px;resize:vertical" placeholder="Symptoms, clinical history, observations..."></textarea>';
    html += '</div>';
    
    html += '</div>';
  }
  
  container.innerHTML = html;
}

function removeBulkFile(index) {
  bulkFiles.splice(index, 1);
  if (bulkFiles.length < 2) {
    resetBulkUpload();
  } else {
    var ct = document.getElementById('bulk-loaded-count');
    if (ct) ct.textContent = bulkFiles.length + ' file' + (bulkFiles.length !== 1 ? 's' : '') + ' selected — fill in patient details below';
    renderBulkFilesList();
    renderBulkPatientForms();
  }
}

// Single upload submission
function go() {
  if (!selectedFile) {
    alert('Please select an MRI file first.');
    return;
  }
  
  var pname = document.getElementById('pname').value.trim();
  if (!pname) {
    alert('Patient name is required.');
    return;
  }
  
  var formData = new FormData();
  formData.append('scan_file', selectedFile);
  formData.append('patient_name', pname);
  formData.append('patient_id', document.getElementById('pid').value.trim());
  formData.append('patient_age', document.getElementById('page').value.trim());
  formData.append('patient_gender', document.getElementById('pgender').value);
  formData.append('scan_type', document.getElementById('scantype').value);
  formData.append('priority', document.getElementById('priority').value);
  formData.append('notes', document.getElementById('pnotes').value.trim());
  
  var overlay = document.getElementById('ov');
  if (overlay) overlay.style.display = 'flex';
  
  var steps = document.querySelectorAll('.step');
  var currentStep = 0;
  var stepInterval = setInterval(function() {
    if (currentStep < steps.length) {
      steps[currentStep].classList.add('go');
      currentStep++;
    }
  }, 3000);
  
  fetch(window.__bfy_upload_url, {
    method: 'POST',
    headers: {'X-CSRFToken': window.__bfy_csrf},
    body: formData
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    clearInterval(stepInterval);
    if (data.success) {
      window.location.href = '/analysis/' + data.scan_id + '/';
    } else {
      if (overlay) overlay.style.display = 'none';
      alert('Error: ' + (data.error || 'Upload failed'));
    }
  })
  .catch(function(err) {
    clearInterval(stepInterval);
    if (overlay) overlay.style.display = 'none';
    alert('Network error: ' + err.message);
  });
}

// Bulk upload submission
function bulkGo() {
  var nameInputs = document.querySelectorAll('.bulk-pname');
  var pidInputs = document.querySelectorAll('.bulk-pid');
  var pageInputs = document.querySelectorAll('.bulk-page');
  var pgenderInputs = document.querySelectorAll('.bulk-pgender');
  var scantypeInputs = document.querySelectorAll('.bulk-scantype');
  var priorityInputs = document.querySelectorAll('.bulk-priority');
  var notesInputs = document.querySelectorAll('.bulk-notes');
  
  var patientsData = [];
  
  for (var i = 0; i < nameInputs.length; i++) {
    var name = nameInputs[i].value.trim();
    if (!name) {
      alert('Please enter patient name for file ' + (i + 1));
      nameInputs[i].focus();
      return;
    }
    
    patientsData.push({
      file: bulkFiles[i],
      name: name,
      pid: pidInputs[i] ? pidInputs[i].value.trim() : '',
      age: pageInputs[i] ? pageInputs[i].value.trim() : '',
      gender: pgenderInputs[i] ? pgenderInputs[i].value : '',
      scantype: scantypeInputs[i] ? scantypeInputs[i].value : 'T1',
      priority: priorityInputs[i] ? priorityInputs[i].value : 'normal',
      notes: notesInputs[i] ? notesInputs[i].value.trim() : ''
    });
  }
  
  var overlay = document.getElementById('ov-bulk');
  if (overlay) overlay.style.display = 'flex';
  
  document.getElementById('bulk-total').textContent = bulkFiles.length;
  
  processBulkUploadSequentially(patientsData, 0, []);
}

function processBulkUploadSequentially(patientsData, currentIndex, scanIds) {
  if (currentIndex >= patientsData.length) {
    window.location.href = '/bulk-results/?scans=' + scanIds.join(',');
    return;
  }
  
  document.getElementById('bulk-current').textContent = currentIndex + 1;
  var progress = ((currentIndex + 1) / patientsData.length) * 100;
  document.getElementById('bulk-progress-fill').style.width = progress + '%';
  
  var patient = patientsData[currentIndex];
  var formData = new FormData();
  formData.append('scan_file', patient.file);
  formData.append('patient_name', patient.name);
  formData.append('patient_id', patient.pid);
  formData.append('patient_age', patient.age);
  formData.append('patient_gender', patient.gender);
  formData.append('scan_type', patient.scantype);
  formData.append('priority', patient.priority);
  formData.append('notes', patient.notes);
  
  fetch(window.__bfy_upload_url, {
    method: 'POST',
    headers: {'X-CSRFToken': window.__bfy_csrf},
    body: formData
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.success) {
      scanIds.push(data.scan_id);
      processBulkUploadSequentially(patientsData, currentIndex + 1, scanIds);
    } else {
      alert('Error uploading file ' + (currentIndex + 1) + ': ' + (data.error || 'Failed'));
      document.getElementById('ov-bulk').style.display = 'none';
    }
  })
  .catch(function(err) {
    alert('Network error on file ' + (currentIndex + 1) + ': ' + err.message);
    document.getElementById('ov-bulk').style.display = 'none';
  });
}
