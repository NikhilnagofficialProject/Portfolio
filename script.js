(function () {
  const sheetId = document.querySelector('meta[name="portfolio-sheet-id"]')?.content?.trim();
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // ---------------- Sheets Fetch ----------------
  if (sheetId) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    fetch(url)
      .then(r => r.text())
      .then(csvText => {
        const lines = csvText.split('\n');
        const header = lines[0].split(',').map(h =>
          h.trim().toLowerCase().replace(/\s+/g, '_')
        );

        const rows = lines.slice(1).map(line =>
          line.split(',').map(cell => cell.trim())
        );
        const items = rows.map(r => {
          return {
            filename: r[0],
            link: r[1],
            last_updated: r[2],
            action: r[3],
            category: r[4]
          };
        }).filter(item => item.filename && item.link);
        renderData(items);
      })
      .catch(err => console.warn("❌ Could not fetch sheet:", err));
  } else {
    console.warn("⚠️ No sheet id provided in meta tag. Using placeholders.");
  }

  function renderData(items) {
    const resumes = items.filter(i => (i['category'] || '').toLowerCase().includes('resume'));
    const projects = items.filter(i => (i['category'] || '').toLowerCase().includes('project'));
    const certifications = items.filter(i => (i['category'] || '').toLowerCase().includes('certification'));
    const achievements = items.filter(i => (i['category'] || '').toLowerCase().includes('achievement'));

    renderResume(resumes);
    renderProjects(projects);
    renderCertifications(certifications);
    renderAchievements(achievements);
  }

  function renderResume(resumes) {
    const viewBtn = document.getElementById('view-resume');
    const downloadBtn = document.getElementById('download-resume');
    const latestResume = resumes[0];

    // Update Resume Buttons
    if (viewBtn && downloadBtn) {
      if (latestResume && latestResume.link) {
        viewBtn.href = latestResume.link;
        downloadBtn.href = transformDriveLinkToDownload(latestResume.link);
      } else {
        // Hide buttons if no resume link is available
        viewBtn.style.display = 'none';
        downloadBtn.style.display = 'none';
      }
    }
  }
  // ---------------- Typing Effect ----------------
  const typingEl = document.getElementById('typing');
  const words = ['Web Developer', 'Frontend Engineer', 'Data Analyst'];
  let wIndex = 0, cIndex = 0, deleting = false;

  function type() {
    if (!typingEl) return;
    let current = words[wIndex];
    if (!deleting) {
      typingEl.textContent = current.substring(0, cIndex + 1);
      cIndex++;
      if (cIndex === current.length) { deleting = true; setTimeout(type, 900); return; }
    } else {
      typingEl.textContent = current.substring(0, cIndex - 1);
      cIndex--;
      if (cIndex < 0) { deleting = false; wIndex = (wIndex + 1) % words.length; cIndex = 0; }
    }
    setTimeout(type, deleting ? 60 : 120);
  }
  type();

  // ---------------- Navbar Scroll ----------------
  const header = document.querySelector('.site-header'); 
  window.addEventListener('scroll', () => {
    if (header) {
      if (window.scrollY > 50) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    }
  });

  // ---------------- Parallax Profile ----------------
  const frame = document.querySelector('.profile-frame');
  if (frame) {
    frame.addEventListener('mousemove', (e) => {
      const rect = frame.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const img = frame.querySelector('.profile-img');
      if (img) img.style.transform = `translate(${x * 8}px, ${y * 6}px) scale(1.02)`;
    });
    frame.addEventListener('mouseleave', () => {
      const img = frame.querySelector('.profile-img');
      if (img) img.style.transform = '';
    });
  }
  
   // --- CUSTOM SCROLL LOGIC ---
  function initializeCustomScroll(id) {
    const track = document.getElementById(id);
    if (!track) return;
    const content = track.innerHTML;
    // Duplicate content for a seamless loop
    track.innerHTML = content + content; 
  }

  function renderCertifications(certifications) {
    const trackContent = document.getElementById('certifications-inner');
    if (!trackContent) return;

    trackContent.innerHTML = '';

    if (certifications.length === 0) {
      trackContent.innerHTML = '<div class="loading-placeholder">No certifications found.</div>';
      return;
    }

    certifications.forEach(c => {
      const title = c['filename'] || 'Untitled';
      const link = c['link'] || '#';
      const lastUpdated = c['last_updated'] || '';
      const downloadLink = transformDriveLinkToDownload(link);

      const item = document.createElement('div');
      item.className = 'scroll-card'; 
       item.innerHTML = `
        <h5 class="card-title">${escapeHtml(title).replace('.pdf', '')}</h5> 
        <p class="card-text muted small">${lastUpdated}</p>
        <div class="d-flex gap-2 mt-auto">
          <a href="${link}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">View</a>
          <a href="${downloadLink}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary">Download</a>
        </div>`;
      trackContent.appendChild(item);
    });
  
    initializeCustomScroll('certifications-inner');
  }

  function renderAchievements(achievements) {
      const grid = document.getElementById('achievements-list');
      if (!grid) return;

      grid.innerHTML = '';
      if (achievements.length === 0) {
          grid.innerHTML = `<div class="col-12"><div class="card"><div class="alert alert-info">No achievements found.</div></div></div>`;
          return;
      }

      achievements.forEach(a => {
          const title = a['filename'] || 'Untitled';
          const link = a['link'] || '#';
          const imageLink = transformDriveLinkToImage(link);

          const col = document.createElement('div');
          // Added d-flex and h-100 for same height
          col.className = 'col-lg-4 col-md-6 d-flex mb-4'; 
          col.innerHTML = `
              <div class="card w-100 h-100">
                  <img src="${imageLink}" class="card-img-top img-fluid" alt="${escapeHtml(title)}"onerror="this.onerror=null;this.src='assets/Images/placeholder.png'">
                  <div class="card-body text-center d-flex flex-column justify-content-end">
                      <a href="${link}" target="_blank" rel="noopener" class="btn btn-sm btn-primary mt-auto">View Original</a>
                  </div>
              </div>
          `;
          grid.appendChild(col);
      });
  }
  
  function renderProjects(projects) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    grid.innerHTML = '';
    if (projects.length === 0) {
      grid.innerHTML = `<div class="col-12"><div class="card"><div class="alert alert-info">No projects found.</div></div></div>`;
      return;
    }

    projects.forEach(p => {
      const title = p['filename'] || 'Untitled';
      const link = p['link'] || '#';
      const desc = p['action'] || '';

      const col = document.createElement('div');
      col.className = 'col-lg-4 col-md-6 d-flex mb-4';
      col.innerHTML = `
        <div class="card w-100 p-3 d-flex flex-column">
          <h5 class="card-title">${escapeHtml(title)}</h5>
          <p class="card-text muted small">${desc} - ${p['last_updated'] || ''}</p>
          <div class="card-buttons mt-auto">
            <a href="${link}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">View</a>
          </div>
        </div>
      `;
      grid.appendChild(col);
    });
  }

  // ---------------- Helpers ----------------
  function transformDriveLinkToDownload(link) {
    try {
      const m = link.match(/\/d\/([^\/]+)/);
      if (m && m[1]) {
        return `https://drive.google.com/uc?export=download&id=${m[1]}`;
      }
    } catch (e) {}
    return link;
  }
  
  function transformDriveLinkToImage(link) {
  try {
    const m = link.match(/\/d\/([^\/]+)/);
    if (m && m[1]) {
      return `https://drive.google.com/thumbnail?id=${m[1]}&sz=s640`; 
    }
  } catch (e) {
    console.error("Error transforming link:", e);
  }
  return 'assets/Images/placeholder.png'; 
}

  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  
  // ---------------- Scroll Reveal (Simplified) ----------------
  const reveals = document.querySelectorAll('.reveal');
  function checkReveal() {
    for (let el of reveals) {
      let top = el.getBoundingClientRect().top;
      if (top < window.innerHeight - 100) {
        el.classList.add('active');
      }
    }
  }
  checkReveal();
  window.addEventListener('scroll', checkReveal);
})();