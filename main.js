const stamps = document.querySelectorAll('.stamp');

stamps.forEach((stamp) => {
    stamp.addEventListener('mouseenter', () => {
        stamp.classList.add('stamp-active');
    });

    stamp.addEventListener('mouseleave', () => {
        stamp.classList.remove('stamp-active');
    });
});
