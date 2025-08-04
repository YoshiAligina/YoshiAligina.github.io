
// Configuration
const GITHUB_USERNAME = 'YoshiAligina';

// DOM Elements
const navbar = document.querySelector('.navbar');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');
const contactForm = document.getElementById('contact-form');

// Navbar scroll effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}

// Smooth scrolling for navigation links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
            targetSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
        
        // Close mobile menu
        if (navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
});

// Active navigation link highlighting
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
});

// GitHub repositories fetching
async function fetchGitHubRepos() {
    try {
        const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=6&sort=updated`);
        const repos = await response.json();
        
        const reposContainer = document.getElementById('github-repos');
        if (!reposContainer) return;
        
        reposContainer.innerHTML = '';
        
        repos
            .filter(repo => !repo.fork)
            .slice(0, 6)
            .forEach(repo => {
                const repoCard = createRepoCard(repo);
                reposContainer.appendChild(repoCard);
            });
    } catch (error) {
        console.error('Error fetching GitHub repos:', error);
        const reposContainer = document.getElementById('github-repos');
        if (reposContainer) {
            reposContainer.innerHTML = '<p style="text-align: center; color: var(--text-light);">Unable to load repositories at the moment.</p>';
        }
    }
}

// Create repository card
function createRepoCard(repo) {
    const card = document.createElement('div');
    card.className = 'repo-card';
    
    const updatedDate = new Date(repo.updated_at).toLocaleDateString();
    
    card.innerHTML = `
        <div class="repo-header">
            <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">
                <strong>${repo.name}</strong>
            </a>
            <span class="repo-stats">⭐ ${repo.stargazers_count} | 🍴 ${repo.forks_count}</span>
        </div>
        <p class="repo-description">${repo.description || 'No description available'}</p>
        <div class="repo-meta">
            <span style="color: var(--primary-color); font-weight: 500;">${repo.language || 'Unknown'}</span> • 
            Updated ${updatedDate}
        </div>
    `;
    
    return card;
}

// Contact form handling
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const email = formData.get('email');
        const message = formData.get('message');
        
        // Create mailto link (since we don't have a backend)
        const subject = `Portfolio Contact from ${name}`;
        const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
        const mailtoLink = `mailto:yoshialigina@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        window.location.href = mailtoLink;
        
        // Reset form
        contactForm.reset();
        
        // Show success message
        showNotification('Message prepared! Your email client should open now.', 'success');
    });
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : '#4299e1'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Initialize animations
function initAnimations() {
    const animatedElements = document.querySelectorAll('.skill-category, .project-card, .contact-method, .repo-card');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Typing effect for hero title
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Parallax effect for hero section
function initParallax() {
    const hero = document.querySelector('.hero');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallax = scrolled * 0.5;
        
        if (hero) {
            hero.style.transform = `translateY(${parallax}px)`;
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Fetch GitHub repositories
    fetchGitHubRepos();
    
    // Initialize animations
    setTimeout(initAnimations, 100);
    
    // Initialize parallax effect
    initParallax();
    
    // Add loading animation
    document.body.classList.add('loaded');
});

// Add some CSS for the loading state
const style = document.createElement('style');
style.textContent = `
    body {
        opacity: 0;
        transition: opacity 0.5s ease;
    }
    
    body.loaded {
        opacity: 1;
    }
    
    .nav-menu.active {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
        padding: 1rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }
    
    .hamburger.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .hamburger.active span:nth-child(2) {
        opacity: 0;
    }
    
    .hamburger.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
    
    @media (max-width: 768px) {
        .nav-menu {
            display: none;
        }
    }
`;

document.head.appendChild(style);
