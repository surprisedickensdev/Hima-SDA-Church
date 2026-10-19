/**
 * Hima Seventh-day Adventist Church & Pathfinder Club
 * Interactive Web Application Engine (code.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCountdown();
  initTabs();
  initAccordions();
  initLightbox();
  initAudioPlayer();
  initSearch();
  initDailyInspiration();
  initForms();
  initBackToTop();
});

/* ==========================================================================
   1. Navigation & Mobile Drawer
   ========================================================================== */
function initNavigation() {
  const hamburger = document.querySelector('.hamburger-btn');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const backdrop = document.querySelector('.mobile-backdrop');
  const drawerClose = document.querySelector('.mobile-drawer-close');
  const header = document.querySelector('.site-header');

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('show');
    if (hamburger) hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
    if (hamburger) hamburger.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      drawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });
  }

  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // Mobile submenu toggles
  document.querySelectorAll('.mobile-nav-dropdown-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const submenu = btn.nextElementSibling;
      if (submenu && submenu.classList.contains('mobile-submenu')) {
        submenu.classList.toggle('show');
        const icon = btn.querySelector('.arrow-icon');
        if (icon) {
          icon.innerHTML = submenu.classList.contains('show') ? '<i class="fa fa-chevron-up"></i>' : '<i class="fa fa-chevron-down"></i>';
        }
      }
    });
  });

  // Sticky header shadow
  window.addEventListener('scroll', () => {
    if (!header) return;
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Close desktop dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
      });
    }
  });
}

/* ==========================================================================
   2. Next Sabbath & Camporee Countdown Timer
   ========================================================================== */
function initCountdown() {
  const daysEl = document.getElementById('sabbath-days');
  const hoursEl = document.getElementById('sabbath-hours');
  const minutesEl = document.getElementById('sabbath-minutes');
  const secondsEl = document.getElementById('sabbath-seconds');

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  function getNextSabbath() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
    let target = new Date(now);

    if (dayOfWeek === 6) {
      // It's Saturday
      target.setHours(9, 0, 0, 0);
      if (now > target) {
        // Next Saturday
        target.setDate(now.getDate() + 7);
      }
    } else {
      // Days until next Saturday
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
      target.setDate(now.getDate() + daysUntilSaturday);
      target.setHours(9, 0, 0, 0);
    }
    return target;
  }

  const nextSabbath = getNextSabbath();

  function updateTimer() {
    const now = new Date().getTime();
    const distance = nextSabbath.getTime() - now;

    if (distance <= 0) {
      const banner = document.getElementById('sabbath-countdown-banner');
      if (banner) {
        banner.innerHTML = '<h3 style="color:var(--color-secondary);margin:0 auto;text-align:center;"><i class="fa fa-sun-o" aria-hidden="true"></i> Happy Sabbath! Divine Worship is Live in Sanctuary <i class="fa fa-sun-o" aria-hidden="true"></i></h3>';
      }
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

/* ==========================================================================
   3. Interactive Tabs Controller
   ========================================================================== */
function initTabs() {
  document.querySelectorAll('.tab-container').forEach(container => {
    const navButtons = container.querySelectorAll('.tab-btn');
    const tabPanes = container.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');

        navButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPane = container.querySelector(`#${targetId}`);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  });
}

/* ==========================================================================
   4. Interactive Accordions
   ========================================================================== */
function initAccordions() {
  document.querySelectorAll('.accordion').forEach(accordion => {
    const items = accordion.querySelectorAll('.accordion-item');

    items.forEach(item => {
      const header = item.querySelector('.accordion-header');
      if (!header) return;

      header.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Optional: close other items in single-open mode
        if (accordion.getAttribute('data-single') === 'true') {
          items.forEach(otherItem => {
            if (otherItem !== item) otherItem.classList.remove('active');
          });
        }

        item.classList.toggle('active', !isActive);
      });
    });
  });
}

/* ==========================================================================
   5. Interactive Lightbox Modal
   ========================================================================== */
let currentGallery = [];
let currentGalleryIndex = 0;

function initLightbox() {
  const modal = document.querySelector('.lightbox-modal');
  if (!modal) return;

  const modalImg = modal.querySelector('.lightbox-img');
  const modalCaption = modal.querySelector('.lightbox-caption');
  const closeBtn = modal.querySelector('.lightbox-close');
  const prevBtn = modal.querySelector('.lightbox-prev');
  const nextBtn = modal.querySelector('.lightbox-next');

  // Collect all gallery items
  const galleryItems = document.querySelectorAll('.gallery-item');
  if (galleryItems.length === 0) return;

  currentGallery = Array.from(galleryItems).map(item => {
    const img = item.querySelector('img');
    const title = item.querySelector('h4') ? item.querySelector('h4').textContent : '';
    const desc = item.querySelector('p') ? item.querySelector('p').textContent : '';
    return {
      src: img ? img.getAttribute('src') : '',
      alt: img ? img.getAttribute('alt') : '',
      caption: title ? `${title} - ${desc}` : (img ? img.getAttribute('alt') : '')
    };
  });

  function showImage(index) {
    if (index < 0) index = currentGallery.length - 1;
    if (index >= currentGallery.length) index = 0;
    currentGalleryIndex = index;

    const data = currentGallery[currentGalleryIndex];
    if (data && modalImg) {
      modalImg.src = data.src;
      modalImg.alt = data.alt || 'Gallery photo';
      if (modalCaption) modalCaption.textContent = data.caption || '';
    }
  }

  function openLightbox(index) {
    showImage(index);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => openLightbox(index));
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', () => showImage(currentGalleryIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => showImage(currentGalleryIndex + 1));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showImage(currentGalleryIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentGalleryIndex + 1);
  });
}

/* ==========================================================================
   6. Interactive Audio Player Simulation
   ========================================================================== */
function initAudioPlayer() {
  const player = document.querySelector('.audio-player-card');
  if (!player) return;

  const playBtn = player.querySelector('.play-toggle-btn');
  const progressFill = player.querySelector('.player-progress-fill');
  const currentTimeEl = player.querySelector('.current-time');
  const durationEl = player.querySelector('.total-duration');
  const progressBar = player.querySelector('.player-progress-bar');
  const trackTitle = player.querySelector('.player-meta h4');

  let isPlaying = false;
  let progress = 35; // start percentage
  let durationSeconds = 195; // 3:15
  let timer = null;

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  if (durationEl) durationEl.textContent = formatTime(durationSeconds);

  function togglePlay() {
    isPlaying = !isPlaying;
    if (playBtn) {
      playBtn.innerHTML = isPlaying ? '<i class="fa fa-pause" aria-hidden="true"></i>' : '<i class="fa fa-play" aria-hidden="true"></i>';
    }

    if (isPlaying) {
      showToast(`Now Playing: ${trackTitle ? trackTitle.textContent : 'Hymn / Song'}`);
      timer = setInterval(() => {
        progress += 0.5;
        if (progress >= 100) {
          progress = 0;
          togglePlay();
        }
        if (progressFill) progressFill.style.width = `${progress}%`;
        const currentSec = (progress / 100) * durationSeconds;
        if (currentTimeEl) currentTimeEl.textContent = formatTime(currentSec);
      }, 500);
    } else {
      clearInterval(timer);
    }
  }

  if (playBtn) playBtn.addEventListener('click', togglePlay);

  if (progressBar) {
    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      progress = (clickX / rect.width) * 100;
      if (progressFill) progressFill.style.width = `${progress}%`;
      const currentSec = (progress / 100) * durationSeconds;
      if (currentTimeEl) currentTimeEl.textContent = formatTime(currentSec);
    });
  }
}

/* ==========================================================================
   7. Live Search Modal
   ========================================================================== */
const searchDatabase = [
  { title: "Home Page", desc: "Welcome, mission, worship hours, and church updates.", url: "index.html", category: "General" },
  { title: "About Hima SDA Church", desc: "Our history, mission, pastoral team, and 28 Fundamental Beliefs.", url: "about.html", category: "About" },
  { title: "Pathfinder Club", desc: "Ages 10-15: Pledge, Law, Aim, Motto, Club Song, Classes, and Honors.", url: "pathfinder club.html", category: "Club" },
  { title: "Adventurer Club", desc: "Ages 4-9: Little Lambs, Early childhood Christian character building.", url: "adventurer club.html", category: "Club" },
  { title: "Ambassador Club", desc: "Ages 16-21: Youth leadership, mission service, and discipleship.", url: "Ambassador club.html", category: "Club" },
  { title: "Adventist Youth Ministries (AY)", desc: "Weekly AY program, Youth rallies, Bible bowl, and fellowship.", url: "youth.html", category: "Ministry" },
  { title: "Young Adults", desc: "College students, campus ministry, and young career fellowship.", url: "young adults.html", category: "Ministry" },
  { title: "Adventist Children Ministries", desc: "Cradle roll to junior Sabbath school classes and VBS.", url: "children.html", category: "Ministry" },
  { title: "Adventist Women Ministries", desc: "Prayer breakfasts, family enrichment, and community outreach.", url: "women.html", category: "Ministry" },
  { title: "Adventist Community Service", desc: "Disaster relief, food pantry, clothing drive, and medical expos.", url: "communty.html", category: "Ministry" },
  { title: "Ministries Overview", desc: "Complete directory of church clubs and specialized departments.", url: "ministries.html", category: "Directory" },
  { title: "Church Resources & Documents", desc: "Elders Handbook, Church Manual, GC Yearly Program, and Sabbath School lessons.", url: "resources.html", category: "Resources" },
  { title: "Media Center", desc: "Watch sermon recordings, listen to choir music, browse photo gallery, and bulletins.", url: "media.html", category: "Media" },
  { title: "Staff & Contact Us", desc: "Pastoral leadership, church elders, location directions, and prayer request form.", url: "staff & contact.html", category: "Contact" },
  { title: "Events & Announcements", desc: "Upcoming Camporee, church calendar, visitor guide, and FAQs.", url: "more.html", category: "Updates" }
];

function initSearch() {
  const modal = document.querySelector('.search-modal');
  const searchInput = document.getElementById('site-search-input');
  const resultsContainer = document.getElementById('search-results-list');
  const openButtons = document.querySelectorAll('.search-trigger-btn');
  const closeBtn = document.querySelector('.search-close-btn');

  if (!modal || !searchInput || !resultsContainer) return;

  function openSearch() {
    modal.classList.add('active');
    searchInput.value = '';
    searchInput.focus();
    renderResults(searchDatabase);
    document.body.style.overflow = 'hidden';
  }

  function closeSearch() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  openButtons.forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    openSearch();
  }));

  if (closeBtn) closeBtn.addEventListener('click', closeSearch);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSearch();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      modal.classList.contains('active') ? closeSearch() : openSearch();
    }
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeSearch();
    }
  });

  function renderResults(items) {
    resultsContainer.innerHTML = '';
    if (items.length === 0) {
      resultsContainer.innerHTML = '<div style="padding:20px;text-align:center;color:var(--color-text-muted);">No matches found. Try searching for "Pathfinder", "Sabbath", "Manual", or "Contact".</div>';
      return;
    }

    items.forEach(item => {
      const a = document.createElement('a');
      a.href = item.url;
      a.className = 'search-result-item';
      a.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="search-result-title">${item.title}</span>
          <span class="search-result-tag">${item.category}</span>
        </div>
        <div class="search-result-desc">${item.desc}</div>
      `;
      resultsContainer.appendChild(a);
    });
  }

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderResults(searchDatabase);
      return;
    }
    const filtered = searchDatabase.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
    renderResults(filtered);
  });
}

/* ==========================================================================
   8. Daily Scripture & Inspiration Generator
   ========================================================================== */
const scriptureList = [
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11" },
  { text: "Don't let anyone look down on you because you are young, but set an example for the believers in speech, in conduct, in love, in faith and in purity.", ref: "1 Timothy 4:12" },
  { text: "The Advent Message to All the World in My Generation.", ref: "Pathfinder Aim" },
  { text: "The Love of Christ Constrains Me.", ref: "Pathfinder Motto" },
  { text: "Fear God and give him glory, because the hour of his judgment has come. Worship him who made the heavens, the earth, the sea and the springs of water.", ref: "Revelation 14:7" },
  { text: "He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.", ref: "Micah 6:8" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", ref: "Joshua 1:9" },
  { text: "Those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", ref: "Isaiah 40:31" }
];

let verseIndex = 0;

function initDailyInspiration() {
  const quoteEl = document.getElementById('daily-verse-text');
  const citeEl = document.getElementById('daily-verse-ref');
  const btn = document.getElementById('new-verse-btn');

  if (!quoteEl || !citeEl || !btn) return;

  function updateVerse() {
    verseIndex = (verseIndex + 1) % scriptureList.length;
    quoteEl.style.opacity = '0';
    citeEl.style.opacity = '0';

    setTimeout(() => {
      quoteEl.textContent = `“${scriptureList[verseIndex].text}”`;
      citeEl.textContent = `— ${scriptureList[verseIndex].ref}`;
      quoteEl.style.opacity = '1';
      citeEl.style.opacity = '1';
    }, 200);
  }

  quoteEl.style.transition = 'opacity 0.25s ease';
  citeEl.style.transition = 'opacity 0.25s ease';
  btn.addEventListener('click', updateVerse);
}

/* ==========================================================================
   9. Interactive Forms & Toast Notification
   ========================================================================== */
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span><i class="fa fa-check-circle" style="color:var(--color-accent-green);" aria-hidden="true"></i></span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(60px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function initForms() {
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const requiredInputs = form.querySelectorAll('[required]');
      let valid = true;

      requiredInputs.forEach(input => {
        if (!input.value.trim()) {
          valid = false;
          input.style.borderColor = 'var(--color-accent-red)';
        } else {
          input.style.borderColor = 'var(--color-border)';
        }
      });

      if (!valid) {
        showToast('Please fill out all required fields before submitting.');
        return;
      }

      // Check form intent
      const isPrayer = form.classList.contains('prayer-form') || form.id === 'prayer-form';
      const isRegistration = form.classList.contains('club-registration-form') || form.id === 'club-registration-form';

      if (isPrayer) {
        showToast('Blessings! Your prayer request has been submitted to the Pastoral Team.');
      } else if (isRegistration) {
        showToast('Registration received! A club leader will contact you soon.');
      } else {
        showToast('Thank you! Your message has been sent to Hima SDA Church.');
      }

      form.reset();
    });
  });
}

/* ==========================================================================
   10. Back to Top Floating Button
   ========================================================================== */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  });

  btn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}
