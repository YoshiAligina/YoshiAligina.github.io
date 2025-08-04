// === AUTHENTIC WIKIPEDIA-STYLE PERSONAL PAGE ===
// Configuration
const GITHUB_USERNAME = 'YoshiAligina';

// Enhanced GitHub repository fetching with Wikipedia-style display
fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`)
  .then(res => res.json())
  .then(repos => {
    const repoList = document.getElementById('repo-list');
    if (!repoList) return;
    
    repoList.innerHTML = '';
    repos
      .filter(repo => !repo.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 8)
      .forEach(repo => {
        const li = document.createElement('li');
        li.className = 'repo-item';
        li.innerHTML = `
          <div class="repo-header">
            <a href="${repo.html_url}" target="_blank" class="external"><strong>${repo.name}</strong></a>
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
      repoList.innerHTML = '<li style="color: #666;">Unable to load repositories at this time.</li>';
    }
  });

// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Add hover effects to external links
  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    if (!link.classList.contains('external')) {
      link.classList.add('external');
    }
  });

  // Simple mobile menu toggle (if needed)
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });
  }
});
