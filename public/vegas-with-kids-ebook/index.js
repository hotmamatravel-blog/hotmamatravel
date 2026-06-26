document.addEventListener('DOMContentLoaded', () => {
  // --- Header and Sticky CTA Banner Scroll Effects ---
  const header = document.querySelector('header');
  const stickyCta = document.getElementById('sticky-cta-banner');
  const heroSection = document.querySelector('.hero');
  
  window.addEventListener('scroll', () => {
    // Header shadow on scroll
    if (window.scrollY > 50) {
      header.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
      header.style.borderColor = 'rgba(255, 255, 255, 0.12)';
    } else {
      header.style.boxShadow = 'none';
      header.style.borderColor = 'var(--border-color)';
    }

    // Show Sticky CTA banner after scrolling past hero section
    if (heroSection) {
      const heroHeight = heroSection.offsetHeight;
      if (window.scrollY > heroHeight - 100) {
        stickyCta.classList.add('active');
      } else {
        stickyCta.classList.remove('active');
      }
    }
  });

  // --- Interactive FAQ Accordion ---
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const headerBtn = item.querySelector('.faq-header');
    headerBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all other items
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
      });
      
      // Toggle current item
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // --- Ebook Preview Carousel ---
  const slidesContainer = document.querySelector('.carousel-slides');
  const slides = document.querySelectorAll('.carousel-slide');
  const dotsContainer = document.querySelector('.carousel-dots');
  let currentSlide = 0;
  const slideCount = slides.length;
  let autoplayInterval;

  // Create dot indicators
  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.classList.add('carousel-dot');
    if (index === 0) dot.classList.add('active');
    dot.addEventListener('click', () => {
      goToSlide(index);
      resetAutoplay();
    });
    dotsContainer.appendChild(dot);
  });

  const dots = document.querySelectorAll('.carousel-dot');

  function goToSlide(index) {
    currentSlide = index;
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    // Update dots
    dots.forEach((dot, idx) => {
      if (idx === currentSlide) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  function nextSlide() {
    let nextIdx = currentSlide + 1;
    if (nextIdx >= slideCount) nextIdx = 0;
    goToSlide(nextIdx);
  }

  function startAutoplay() {
    autoplayInterval = setInterval(nextSlide, 5000); // Change slide every 5s
  }

  function resetAutoplay() {
    clearInterval(autoplayInterval);
    startAutoplay();
  }

  startAutoplay();

  // --- Simulated Checkout Modal Flow ---
  const modalOverlay = document.getElementById('checkout-modal');
  const modalClose = document.querySelector('.modal-close');
  const buyButtons = document.querySelectorAll('.trigger-buy-flow');
  const checkoutForm = document.getElementById('checkout-form');
  const formView = document.getElementById('modal-form-view');
  const successView = document.getElementById('modal-success-view');

  // Open modal on click (only if href is empty or '#')
  buyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const href = btn.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        // Allow default redirection to Stripe / Gumroad link
        return;
      }
      e.preventDefault();
      openModal();
    });
  });

  // Close modal click
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  function openModal() {
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock background scroll
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset views after animation finishes
    setTimeout(() => {
      formView.style.display = 'block';
      successView.style.display = 'none';
      checkoutForm.reset();
    }, 300);
  }

  // Handle Checkout Submission
  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('checkout-email').value;
    const name = document.getElementById('checkout-name').value;
    
    if (!email || !name) return;

    // Simulate Payment Processing delay
    const submitBtn = checkoutForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Processing Securely...';

    setTimeout(() => {
      // Show Success View
      formView.style.display = 'none';
      successView.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      // Dynamically create a download link to deliver the Ebook
      const downloadBtn = document.getElementById('download-ebook-btn');
      downloadBtn.href = '/family-travel-guide-las-vegas-ebook.pdf';
      downloadBtn.download = 'family-travel-guide-las-vegas-ebook.pdf';
    }, 1500);
  });
});
