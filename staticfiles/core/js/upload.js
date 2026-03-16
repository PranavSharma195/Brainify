// COMPLETE WORKING upload.js with bulk upload

let selectedFile = null;
let bulkFiles = [];
let bulkMode = 'single';
const MAX_BULK_FILES = 50;

// Escape HTML
function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Mode switching
function switchUploadMode(mode) {
  bulkMode = mode;
  
  var singleMode = document.getElementById('singleUploadMode');
  var bulkUploadMode = document.getElementById('bulkUploadMode');
  var tabs = document.querySelectorAll('.upload-tab');
  
  tabs.forEach(function(tab) {
    var tabMode = tab.getAttribute('data-mode');
    if (tabMode === mode) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  if (mode === 'single') {
    if (singleMode) singleMode.style.display = 'grid';
    if (bulkUploadMode) bulkUploadMode.style.display = 'none';
  } else {
    if (singleMode) singleMode.style.display = 'none';
    if (bulkUploadMode) bulkUploadMode.style.display = 'grid';
  }
}

// Single upload
var fileInput = document.getElementById('fi');
var dropbox = document.getElementById('db');
var fileInfo = document.getElementById('fi-info');
var fileName = document.getElementById('fi-name');
var dbIcon = document.getElementById('dbIcon');

if (fileInput && dropbox) {
  fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
      selectedFile = e.target.files[0];
      if (fileName) fileName.textContent = selectedFile.name;
      if (fileInfo) fileInfo.style.display = 'flex';
      if (dbIcon) dbIcon.style.color = 'var(--green, #1AD080)';
    }
  });

  dropbox.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropbox.style.borderColor = 'var(--blue)';
    dropbox.style.background = 'var(--as)';
  });

  dropbox.addEventListener('dragleave', function() {
    dropbox.style.borderColor = '';
    dropbox.style.background = '';
  });

  dropbox.addEventListener('drop', function(e) {
    e.preventDefault();
    dropbox.style.borderColor = '';
    dropbox.style.background = '';
    
    if (e.dataTransfer.files.length > 0) {
      selectedFile = e.dataTransfer.files[0];
      if (fileName) fileName.textContent = selectedFile.name;
      if (fileInfo) fileInfo.style.display = 'flex';
      if (dbIcon) dbIcon.style.color = 'var(--green, #1AD080)';
    }
  });
}

// Bulk upload
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
    bulkDropbox.style.borderColor = 'var(--blue)';
    bulkDropbox.style.background = 'var(--as)';
  });

  bulkDropbox.addEventListener('dragleave', function() {
    bulkDropbox.style.borderColor = '';
    bulkDropbox.style.background = '';
  });

  bulkDropbox.addEventListener('drop', function(e) {
    e.preventDefault();
    bulkDropbox.style.borderColor = '';
    bulkDropbox.style.background = '';
    
    if (e.dataTransfer.files.length > 0) {
      handleBulkFiles(Array.from(e.dataTransfer.files));
    }
  });
}

function handleBulkFiles(files) {
  console.log('handleBulkFiles called with', files.length, 'files');
  
  if (files.length < 2) {
    alert('Please select at least 2 files for bulk upload.');
    return;
  }
  
  if (files.length > MAX_BULK_FILES) {
    alert('Maximum ' + MAX_BULK_FILES + ' files allowed. You selected ' + files.length + ' files.');
    return;
  }
  
  bulkFiles = files;
  console.log('bulkFiles set to', bulkFiles.length, 'files');
  
  renderBulkFilesList();
  renderBulkPatientForms();
  
  var bulkSub = document.getElementById('bulk-sub');
  if (bulkSub) bulkSub.style.display = 'flex';
}

function renderBulkFilesList() {
  console.log('renderBulkFilesList called');
  var container = document.getElementById('bulk-files-list');
  if (!container) {
    console.error('bulk-files-list container not found');
    return;
  }
  
  var html = '';
  
  for (var i = 0; i < bulkFiles.length; i++) {
    var f = bulkFiles[i];
    var sizeMB = (f.size / 1024 / 1024).toFixed(2);
    
    html += '<div class="bulk-file-item" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--card2);border:1px solid var(--line);border-radius:10px">';
    html += '<div class="bulk-file-icon" style="width:40px;height:40px;border-radius:8px;background:var(--as);border:1px solid var(--al);display:flex;align-items:center;justify-content:center">';
    html += '<span class="material-symbols-rounded" style="font-size:20px;color:var(--blue)">description</span>';
    html += '</div>';
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-size:13px;font-weight:600;color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(f.name) + '</div>';
    html += '<div style="font-size:11px;color:var(--muted)">' + sizeMB + ' MB</div>';
    html += '</div>';
    html += '<button onclick="removeBulkFile(' + i + ')" class="bulk-file-remove" style="width:32px;height:32px;border-radius:6px;background:transparent;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;cursor:pointer">';
    html += '<span class="material-symbols-rounded" style="font-size:16px;color:var(--muted)">close</span>';
    html += '</button>';
    html += '</div>';
  }
  
  container.innerHTML = html;
  console.log('File list rendered with', bulkFiles.length, 'files');
}

function renderBulkPatientForms() {
  console.log('renderBulkPatientForms called');
  var container = document.getElementById('bulk-patients-container');
  if (!container) {
    console.error('bulk-patients-container not found');
    return;
  }
  
  var html = '';
  
  for (var i = 0; i < bulkFiles.length; i++) {
    var f = bulkFiles[i];
    
    html += '<div class="bulk-patient-form card" style="margin-bottom:16px">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--line)">';
    html += '<div style="width:32px;height:32px;border-radius:50%;background:var(--blue);display:flex;align-items:center;justify-content:center;font-weight:800;color:white;font-size:14px">' + (i + 1) + '</div>';
    html += '<span style="font-weight:700;font-size:13.5px;color:var(--white);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(f.name) + '</span>';
    html += '</div>';
    
    html += '<div class="fg">';
    html += '<label class="fl">Patient Name <span style="color:var(--red,#EE5555)">*</span></label>';
    html += '<div class="fi-wrap">';
    html += '<span class="fi-ico"><span class="material-symbols-rounded">person</span></span>';
    html += '<input type="text" class="fi bulk-pname" data-index="' + i + '" placeholder="e.g. John Doe">';
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
  }
  
  container.innerHTML = html;
  console.log('Patient forms rendered for', bulkFiles.length, 'files');
}

function removeBulkFile(index) {
  var newFiles = [];
  for (var i = 0; i < bulkFiles.length; i++) {
    if (i !== index) {
      newFiles.push(bulkFiles[i]);
    }
  }
  bulkFiles = newFiles;
  
  if (bulkFiles.length < 2) {
    bulkFiles = [];
    document.getElementById('bulk-files-list').innerHTML = '';
    document.getElementById('bulk-patients-container').innerHTML = '';
    var bulkSub = document.getElementById('bulk-sub');
    if (bulkSub) bulkSub.style.display = 'none';
    return;
  }
  
  renderBulkFilesList();
  renderBulkPatientForms();
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
    headers: {
      'X-CSRFToken': window.__bfy_csrf
    },
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
  console.log('bulkGo called');
  var nameInputs = document.querySelectorAll('.bulk-pname');
  console.log('Found', nameInputs.length, 'name inputs');
  
  var patientsData = [];
  
  for (var i = 0; i < nameInputs.length; i++) {
    var name = nameInputs[i].value.trim();
    if (!name) {
      alert('Please enter patient name for file ' + (i + 1));
      return;
    }
    patientsData.push({
      file: bulkFiles[i],
      name: name
    });
  }
  
  console.log('Starting bulk upload for', patientsData.length, 'patients');
  
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
  formData.append('patient_id', '');
  formData.append('patient_age', '');
  formData.append('patient_gender', '');
  formData.append('scan_type', 'T1');
  formData.append('priority', 'normal');
  formData.append('notes', '');
  
  fetch(window.__bfy_upload_url, {
    method: 'POST',
    headers: {
      'X-CSRFToken': window.__bfy_csrf
    },
    body: formData
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.success) {
      scanIds.push(data.scan_id);
      processBulkUploadSequentially(patientsData, currentIndex + 1, scanIds);
    } else {
      alert('Error uploading file ' + (currentIndex + 1) + ': ' + (data.error || 'Unknown error'));
      var overlay = document.getElementById('ov-bulk');
      if (overlay) overlay.style.display = 'none';
    }
  })
  .catch(function(err) {
    alert('Network error on file ' + (currentIndex + 1) + ': ' + err.message);
    var overlay = document.getElementById('ov-bulk');
    if (overlay) overlay.style.display = 'none';
  });
}
