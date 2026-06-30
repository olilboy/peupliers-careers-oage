const jobCards = [...document.querySelectorAll(".job-card")];
const filterButtons = [...document.querySelectorAll(".filters button")];
const heroFilterLinks = [...document.querySelectorAll("[data-hero-filter]")];
const filterLinks = [...document.querySelectorAll("[data-filter-link]")];
const jobList = document.querySelector(".job-list");
const jobCount = document.querySelector(".job-count");
const jobsRail = document.querySelector(".jobs-rail[data-loop='true']");
const jobsMoreButton = document.querySelector(".jobs-more-button");
const header = document.querySelector(".site-header");
const hero = document.querySelector(".hero-msp") || document.querySelector(".hero");
const jobsSection = document.querySelector("#emplois");
const unitFilters = ["cfps", "ems", "esi"];
const contractFilters = ["full", "stages", "part"];
const selectableFilters = [...unitFilters, ...contractFilters];
const selectedFilters = new Set();
const teamBlocks = [...document.querySelectorAll(".team-map article")];
let jobsExpanded = false;
const collapsedJobsLimit = 5;

function updateHeaderState() {
  if (!header || !hero) return;

  const heroBottom = hero.offsetTop + hero.offsetHeight;
  header.classList.toggle("on-hero", window.scrollY < heroBottom - 120);

  if (jobsSection) {
    const headerLine = window.scrollY + 140;
    const jobsTop = jobsSection.offsetTop;
    const jobsBottom = jobsTop + jobsSection.offsetHeight;

    header.classList.toggle("on-jobs", headerLine >= jobsTop && headerLine < jobsBottom);
  }
}

window.addEventListener("scroll", updateHeaderState, { passive: true });
window.addEventListener("resize", updateHeaderState);
updateHeaderState();

function closeCard(card) {
  card.classList.remove("open");
  if (card.querySelector(".job-toggle")) {
    card.querySelector(".job-toggle").setAttribute("aria-expanded", "false");
  }
  const arrow = card.querySelector(".arrow");
  if (arrow) arrow.textContent = "›";
}

function openCard(card) {
  card.classList.add("open");
  if (card.querySelector(".job-toggle")) {
    card.querySelector(".job-toggle").setAttribute("aria-expanded", "true");
  }
  const arrow = card.querySelector(".arrow");
  if (arrow) arrow.textContent = "⌄";
}

function ensureOpenVisibleCard(visibleCards) {
  visibleCards.forEach(closeCard);
}

let jobLoopBoundary = 0;
let jobLoopPaused = false;
let jobLoopPosition = 0;
let jobLoopLastTime = 0;
const jobLoopSpeed = 46;

function rebuildJobLoop(visibleCards) {
  if (!jobList || !jobsRail) return;

  jobList.querySelectorAll(".job-card-loop-clone").forEach((clone) => clone.remove());
  jobList.scrollTop = 0;
  jobLoopBoundary = 0;
  jobLoopPosition = 0;

  if (!visibleCards.length) return;

  const emptyMessage = jobList.querySelector(".empty-jobs");
  const minimumLoopHeight = jobList.clientHeight * 2.2;
  let safety = 0;

  while (jobList.scrollHeight < minimumLoopHeight && safety < 12) {
    visibleCards.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.classList.add("job-card-loop-clone");
      clone.removeAttribute("id");
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("a, button, [tabindex]").forEach((control) => {
        control.setAttribute("tabindex", "-1");
      });
      if (emptyMessage) {
        emptyMessage.before(clone);
      }
    });
    safety += 1;
  }

  const firstClone = jobList.querySelector(".job-card-loop-clone");

  if (firstClone) {
    jobLoopBoundary = firstClone.offsetTop - visibleCards[0].offsetTop;
  }
}

function animateJobLoop(timestamp) {
  const elapsed = jobLoopLastTime ? Math.min(timestamp - jobLoopLastTime, 40) : 0;
  jobLoopLastTime = timestamp;

  if (jobList && jobLoopBoundary > 0 && !jobLoopPaused && !document.hidden) {
    jobLoopPosition += jobLoopSpeed * (elapsed / 1000);

    if (jobLoopPosition >= jobLoopBoundary) {
      jobLoopPosition -= jobLoopBoundary;
    }

    jobList.scrollTop = jobLoopPosition;
  } else {
    jobLoopLastTime = timestamp;
  }

  window.requestAnimationFrame(animateJobLoop);
}

if (jobsRail && jobList) {
  jobsRail.addEventListener("mouseenter", () => {
    jobLoopPaused = true;
  });
  jobsRail.addEventListener("mouseleave", () => {
    jobLoopPosition = jobList.scrollTop;
    jobLoopPaused = false;
  });
  jobsRail.addEventListener("focusin", () => {
    jobLoopPaused = true;
  });
  jobsRail.addEventListener("focusout", () => {
    jobLoopPosition = jobList.scrollTop;
    jobLoopPaused = false;
  });
  jobsRail.addEventListener("touchstart", () => {
    jobLoopPaused = true;
  }, { passive: true });
  jobsRail.addEventListener("touchend", () => {
    jobLoopPosition = jobList.scrollTop;
    jobLoopPaused = false;
  }, { passive: true });
  jobList.addEventListener("scroll", () => {
    if (jobLoopPaused) {
      jobLoopPosition = jobList.scrollTop;
    }
  }, { passive: true });

  window.requestAnimationFrame(animateJobLoop);
}

jobCards.forEach((card) => {
  const toggle = card.querySelector(".job-toggle");

  if (toggle) {
    toggle.addEventListener("click", (event) => {
      if (!event.target.closest("a")) {
        event.preventDefault();
        card.classList.toggle("open");
        const isOpen = card.classList.contains("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        const arrow = card.querySelector(".arrow");
        if (arrow) arrow.textContent = isOpen ? "⌄" : "›";
      }
    });
  }
});

function updateFilterButtons() {
  const hasSelection = selectedFilters.size > 0;

  filterButtons.forEach((button) => {
    const filter = button.dataset.filter;
    const isActive = filter === "all" ? !hasSelection : selectedFilters.has(filter);

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function applySelectedFilters() {
  updateFilterButtons();

  let visibleCards = [];
  const selectedUnits = unitFilters.filter((filter) => selectedFilters.has(filter));
  const selectedContracts = contractFilters.filter((filter) => selectedFilters.has(filter));

  jobCards.forEach((card) => {
    const matchesUnit = selectedUnits.length === 0 || selectedUnits.includes(card.dataset.unit);
    const matchesContract = selectedContracts.length === 0 || selectedContracts.includes(card.dataset.contract);
    const matches = matchesUnit && matchesContract;

    card.classList.toggle("is-hidden", !matches);

    if (matches) {
      visibleCards.push(card);
    } else {
      closeCard(card);
    }
  });

  if (jobList) jobList.classList.toggle("is-empty", visibleCards.length === 0);

  visibleCards.forEach((card, index) => {
    const shouldHideExtra = !jobsExpanded && index >= collapsedJobsLimit;
    card.classList.toggle("is-extra-hidden", shouldHideExtra);
  });

  if (jobCount) {
    const total = visibleCards.length;
    const label = total > 1 ? "offres disponibles" : "offre disponible";
    jobCount.textContent = `${total} ${label}`;
  }

  if (jobsMoreButton) {
    const canExpand = visibleCards.length > collapsedJobsLimit;
    jobsMoreButton.hidden = !canExpand;
    jobsMoreButton.textContent = jobsExpanded ? "Afficher moins" : "Voir plus de postes";
  }

  ensureOpenVisibleCard(visibleCards);
  window.requestAnimationFrame(() => rebuildJobLoop(visibleCards));
}

function applyFilter(filter) {
  selectedFilters.clear();
  jobsExpanded = false;

  if (filter !== "all") {
    selectedFilters.add(filter);
  }

  applySelectedFilters();
}

function toggleFilter(filter) {
  jobsExpanded = false;

  if (filter === "all") {
    selectedFilters.clear();
    applySelectedFilters();
    return;
  }

  if (selectedFilters.has(filter)) {
    selectedFilters.delete(filter);
  } else {
    selectedFilters.add(filter);
  }

  const everythingSelected = selectableFilters.every((item) => selectedFilters.has(item));

  if (everythingSelected) {
    selectedFilters.clear();
  }

  applySelectedFilters();
}

filterButtons.forEach((button) => {
  button.setAttribute("aria-pressed", String(button.classList.contains("active")));

  button.addEventListener("click", () => {
    toggleFilter(button.dataset.filter);
  });
});

if (jobsMoreButton) {
  jobsMoreButton.addEventListener("click", () => {
    jobsExpanded = !jobsExpanded;
    applySelectedFilters();
  });
}

heroFilterLinks.forEach((link) => {
  link.addEventListener("click", () => {
    applyFilter(link.dataset.heroFilter);
  });
});

filterLinks.forEach((link) => {
  link.addEventListener("click", () => {
    applyFilter(link.dataset.filterLink);
  });
});

applySelectedFilters();

const countUpNumbers = [...document.querySelectorAll(".count-up")];

function animateCountUp(element) {
  const target = Number(element.dataset.count);
  const suffix = element.dataset.suffix || "";
  const duration = 850;
  const startTime = performance.now();

  element.classList.add("is-counting");

  function updateNumber(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);

    element.textContent = `${value}${suffix}`;

    if (progress < 1) {
      window.requestAnimationFrame(updateNumber);
    } else {
      element.textContent = `${target}${suffix}`;
      element.classList.remove("is-counting");
    }
  }

  window.requestAnimationFrame(updateNumber);
}

if (countUpNumbers.length && "IntersectionObserver" in window) {
  const reduceCountMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const countObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      if (reduceCountMotion) {
        const suffix = entry.target.dataset.suffix || "";
        entry.target.textContent = `${entry.target.dataset.count}${suffix}`;
      } else {
        animateCountUp(entry.target);
      }

      observer.unobserve(entry.target);
    });
  }, { threshold: .65 });

  countUpNumbers.forEach((number) => {
    if (!reduceCountMotion) {
      number.textContent = `0${number.dataset.suffix || ""}`;
    }
    countObserver.observe(number);
  });
}

function toggleTeamBlock(block) {
  const willOpen = !block.classList.contains("open");

  teamBlocks.forEach((item) => {
    item.classList.remove("open");
    item.setAttribute("aria-expanded", "false");
  });

  if (willOpen) {
    block.classList.add("open");
    block.setAttribute("aria-expanded", "true");
  }
}

teamBlocks.forEach((block) => {
  block.addEventListener("click", () => toggleTeamBlock(block));
  block.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleTeamBlock(block);
    }
  });
});
