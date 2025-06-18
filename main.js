// === CONFIGURATION ===
const GITHUB_USERNAME = 'YoshiAligina'; // Replace with your GitHub username

// === Populate GitHub Profile Info (optional: for dynamic infobox) ===
fetch(`https://api.github.com/users/${GITHUB_USERNAME}`)
  .then(res => res.json())
  .then(profile => {
    // Optionally update infobox fields dynamically
    // document.getElementById('infobox').querySelector('img').src = profile.avatar_url;
    // document.getElementById('infobox').querySelector('a[href^="https://github.com"]').href = profile.html_url;
  });

// === Populate GitHub Repositories ===
fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`)
  .then(res => res.json())
  .then(repos => {
    const repoList = document.getElementById('repo-list');
    repoList.innerHTML = '';
    repos
      .filter(repo => !repo.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10)
      .forEach(repo => {
        const li = document.createElement('li');
        li.innerHTML = `
          <a href="${repo.html_url}" target="_blank"><strong>${repo.name}</strong></a>
          <br>
          ${repo.description || ''}
          <br>
          <span style="font-size:0.9em;color:#555;">
            ★ ${repo.stargazers_count} | Updated: ${new Date(repo.updated_at).toLocaleDateString()}
          </span>
        `;
        repoList.appendChild(li);
      });
  });
