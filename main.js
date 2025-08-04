// === ENHANCED WIKIPEDIA-STYLE PERSONAL PAGE ===
// Configuration
const GITHUB_USERNAME = 'YoshiAligina';

// Enhanced sidebar toggle with responsive handling
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');

if (sidebarToggle && sidebar) {
  sidebarToggle.onclick = () => {
    sidebar.classList.toggle('show');
  };
}

// Table of Contents functionality
const tocToggle = document.getElementById('toc-toggle');
const tocList = document.querySelector('.toc-list');

if (tocToggle && tocList) {
  tocToggle.onclick = () => {
    if (tocList.style.display === 'none') {
      tocList.style.display = 'block';
      tocToggle.textContent = '[hide]';
    } else {
      tocList.style.display = 'none';
      tocToggle.textContent = '[show]';
    }
  };
}

// Smooth scrolling for navigation links
document.querySelectorAll('.toc-list a, aside nav a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href').substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Add edit buttons to sections (Wikipedia-style)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('h2[id]').forEach(heading => {
    const editBtn = document.createElement('span');
    editBtn.className = 'edit-section';
    editBtn.innerHTML = '[<a href="#" onclick="alert(\'Edit functionality would be here!\'); return false;">edit</a>]';
    editBtn.style.fontSize = '0.8em';
    editBtn.style.fontWeight = 'normal';
    editBtn.style.marginLeft = '10px';
    heading.appendChild(editBtn);
  });
});

// Enhanced GitHub repository fetching
fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`)
  .then(res => res.json())
  .then(repos => {
    const repoList = document.getElementById('repo-list');
    if (!repoList) return;
    
    repoList.innerHTML = '';
    repos
      .filter(repo => !repo.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10)
      .forEach(repo => {
        const li = document.createElement('li');
        li.className = 'repo-item';
        li.innerHTML = `
          <div class="repo-header">
            <a href="${repo.html_url}" target="_blank" class="external-link"><strong>${repo.name}</strong></a>
            <span class="repo-stats">★ ${repo.stargazers_count} | 🍴 ${repo.forks_count}</span>
          </div>
          <p class="repo-description">${repo.description || 'No description available'}</p>
          <div class="repo-meta">
            <span class="repo-language">${repo.language || 'Unknown'}</span> |
            <span class="repo-updated">Updated: ${new Date(repo.updated_at).toLocaleDateString()}</span>
          </div>
        `;
        repoList.appendChild(li);
      });
  })
  .catch(err => {
    const repoList = document.getElementById('repo-list');
    if (repoList) {
      repoList.innerHTML = '<li>Unable to load repositories at this time.</li>';
    }
  });

// Citation hover tooltips (Wikipedia-style)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('sup a').forEach(citation => {
    citation.addEventListener('mouseenter', (e) => {
      const refId = e.target.getAttribute('href').substring(1);
      const refElement = document.getElementById(refId);
      if (refElement) {
        const tooltip = document.createElement('div');
        tooltip.className = 'citation-tooltip';
        tooltip.textContent = refElement.textContent;
        tooltip.style.position = 'absolute';
        tooltip.style.background = '#f8f9fa';
        tooltip.style.border = '1px solid #a2a9b1';
        tooltip.style.padding = '8px';
        tooltip.style.fontSize = '0.8em';
        tooltip.style.maxWidth = '300px';
        tooltip.style.zIndex = '1000';
        tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        document.body.appendChild(tooltip);
        
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = (rect.right + 10) + 'px';
        tooltip.style.top = rect.bottom + 'px';
        
        e.target._tooltip = tooltip;
      }
    });
    
    citation.addEventListener('mouseleave', (e) => {
      if (e.target._tooltip) {
        document.body.removeChild(e.target._tooltip);
        delete e.target._tooltip;
      }
    });
  });

  // Add "last modified" timestamp
  const lastModified = document.createElement('div');
  lastModified.className = 'last-modified';
  lastModified.innerHTML = `<small>This page was last edited on ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })} at ${new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })} (UTC).</small>`;
  
  const main = document.querySelector('main');
  if (main) {
    main.appendChild(lastModified);
  }
});
