function Loading(){
    var tl=gsap.timeline()
    tl.to("#yellow",{
    top:"-100%",
    delay:0.5,
    duration:0.5,
    ease:"expo.out"
    })
    tl.from("#yellow1",{
        top:"100%",
    delay:0.5,
    duration:0.5,
    ease:"expo.out"
    },"anim")
   tl.to("#loader h1", {
  delay: 0.5,
  color: "black"
}, "anim")

   tl.to("#loader", {
  opacity: 0,
  duration: 0.5,
  onComplete: () => {
    document.querySelector("#loader").style.display = "none";
  }
});

    tl.to("#loader",{
    opacity:0
    })
}

function initMovingText() {
  const movingContainers = document.querySelectorAll('.moving');
  
  movingContainers.forEach(container => {
    const movingIn = container.querySelector('.moving-in');
    if (movingIn) {
      // Clone the content 3 times for seamless looping
      const content = movingIn.innerHTML;
      movingIn.innerHTML = content + content + content;
      
      // Calculate width based on content
      const h5Elements = movingIn.querySelectorAll('h5');
      let totalWidth = 0;
      h5Elements.forEach(el => {
        totalWidth += el.offsetWidth + 30; // 30px for padding
      });
      
      // Adjust animation duration based on content width
      movingIn.style.animationDuration = `${totalWidth / 100}s`;
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  Loading();
  initMovingText();
  
  // Initialize Locomotive Scroll
  const scroll = new LocomotiveScroll({
    el: document.querySelector('#main'),
    smooth: true,
    multiplier: 0.8,
    inertia: 0.8,
    smartphone: {
      smooth: true
    },
    tablet: {
      smooth: true
    }
  });

  // Navbar scroll effect
  window.addEventListener('scroll', function() {
    const nav = document.getElementById('nav');
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  // Image hover effect for page2
  const elems = document.querySelectorAll(".elem");
  const page2 = document.querySelector("#page2");
  
  elems.forEach(function(elem) {
    elem.addEventListener("mouseenter", function() {
      const bgimg = elem.getAttribute("data-img");
      page2.style.backgroundImage = `url(${bgimg})`;
      page2.style.backgroundSize = 'cover';
      page2.style.backgroundPosition = 'center';
      page2.style.transition = 'background-image 0.5s ease';
    });
  });

  // Menu toggle for mobile
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  menuToggle.addEventListener('click', () => {
    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
  });

  // Close menu when clicking on a link
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        navLinks.style.display = 'none';
      }
    });
  });

  // GSAP animations for page3 images
  gsap.utils.toArray(".image-container").forEach((container, i) => {
    gsap.from(container, {
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        toggleActions: "play none none none",
        scroller: "#main"
      },
      opacity: 0,
      y: 50,
      duration: 0.8,
      delay: i * 0.1
    });
  });

  // Footer animation
  gsap.from("#footer", {
    scrollTrigger: {
      trigger: "#footer",
      start: "top bottom",
      toggleActions: "play none none none",
      scroller: "#main"
    },
    opacity: 0,
    y: 50,
    duration: 1
  });
});