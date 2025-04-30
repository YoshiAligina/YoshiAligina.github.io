// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: 'smooth'
        });
    });
});

// Add active class to navigation items on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('nav ul li a');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Form submission with validation
const contactForm = document.querySelector('.contact-form form');

if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        const nameInput = this.querySelector('input[name="name"]');
        const emailInput = this.querySelector('input[name="email"]');
        const messageInput = this.querySelector('textarea[name="message"]');
        
        let isValid = true;
        
        if (nameInput.value.trim() === '') {
            isValid = false;
            showError(nameInput, 'Please enter your name');
        } else {
            clearError(nameInput);
        }
        
        if (emailInput.value.trim() === '') {
            isValid = false;
            showError(emailInput, 'Please enter your email');
        } else if (!isValidEmail(emailInput.value)) {
            isValid = false;
            showError(emailInput, 'Please enter a valid email');
        } else {
            clearError(emailInput);
        }
        
        if (messageInput.value.trim() === '') {
            isValid = false;
            showError(messageInput, 'Please enter your message');
        } else {
            clearError(messageInput);
        }
        
        if (!isValid) {
            e.preventDefault();
        }
    });
}

function showError(input, message) {
    const formGroup = input.parentElement;
    const errorElement = formGroup.querySelector('.error-message') || document.createElement('div');
    
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    if (!formGroup.querySelector('.error-message')) {
        formGroup.appendChild(errorElement);
    }
    
    input.classList.add('error');
}

function clearError(input) {
    const formGroup = input.parentElement;
    const errorElement = formGroup.querySelector('.error-message');
    
    if (errorElement) {
        formGroup.removeChild(errorElement);
    }
    
    input.classList.remove('error');
}

function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

window.addEventListener('scroll', function() {
    const elements = document.querySelectorAll('.parallax-element');
    elements.forEach(el => {
        const position = el.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.2;

        if(position < screenPosition) {
            el.classList.add('active');
        }
    });
});
// Fetch GitHub repositories and populate work-grid
document.addEventListener('DOMContentLoaded', () => {
    const workGrid = document.getElementById('work-grid');
    const loadingDiv = document.getElementById('work-loading');
    const errorDiv = document.getElementById('work-error');

    // Show loading message
    loadingDiv.style.display = 'block';

    fetch('https://api.github.com/users/YoshiAligina/repos')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(repos => {
            // Hide loading message
            loadingDiv.style.display = 'none';

            // Filter out the github.io repository and sort by last updated
            const filteredRepos = repos
                .filter(repo => repo.name !== 'YoshiAligina.github.io')
                .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

            if (filteredRepos.length === 0) {
                errorDiv.textContent = 'No public projects found.';
                errorDiv.style.display = 'block';
                return;
            }

            // Create work-item for each repository
            filteredRepos.forEach(repo => {
                const workItem = document.createElement('div');
                workItem.className = 'work-item text-only'; // Use text-only class for simplicity

                // Create overlay content
                const workOverlay = document.createElement('div');
                workOverlay.className = 'work-overlay';

                const title = document.createElement('h3');
                title.textContent = repo.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); // Capitalize words

                const description = document.createElement('p');
                description.textContent = repo.description || 'No description available.';

                const link = document.createElement('a');
                link.href = repo.html_url;
                link.className = 'btn';
                link.textContent = 'View on GitHub';
                link.target = '_blank';

                workOverlay.appendChild(title);
                workOverlay.appendChild(description);
                workOverlay.appendChild(link);

                const img = document.createElement('img');
                img.src = '';
                img.alt = '';

                workItem.appendChild(img);
                workItem.appendChild(workOverlay);
                workGrid.appendChild(workItem);
            });
        })
        .catch(error => {
            console.error('Error fetching repositories:', error);
            loadingDiv.style.display = 'none';
            errorDiv.style.display = 'block';
        });
});
const customCursor = document.querySelector('.custom-cursor');
const heroText = document.querySelector('.hero-text');

heroText.addEventListener('mouseenter', () => {
    customCursor.classList.add('active');
});

heroText.addEventListener('mouseleave', () => {
    customCursor.classList.remove('active');
});

heroText.addEventListener('mousemove', (e) => {
    customCursor.style.left = `${e.clientX}px`;
    customCursor.style.top = `${e.clientY}px`;
});
