(function renderProjectDetails() {
  const app = document.getElementById("project-root");
  if (!app) return;
  const themeStorageKey = window.THEME_STORAGE_KEY || "portfolioTheme";
  const getTheme = () => {
    if (typeof window.getPortfolioTheme === "function") {
      return window.getPortfolioTheme();
    }
    try {
      return localStorage.getItem(themeStorageKey) === "light" ? "light" : "dark";
    } catch (err) {
      return "dark";
    }
  };
  const applyTheme = (theme) => {
    if (typeof window.applyPortfolioTheme === "function") {
      window.applyPortfolioTheme(theme);
      return;
    }
    if (document.body) {
      document.body.dataset.theme = theme === "light" ? "light" : "dark";
    }
  };

  applyTheme(getTheme());

  const pathParts = window.location.pathname.replace(/\/+$/, "").split("/");
  const slug = decodeURIComponent(pathParts[pathParts.length - 1] || "");
  const dataMap = window.PROJECT_DETAILS || {};
  const data = dataMap[slug];
  const likesApiUrl = typeof window.LIKES_API_URL === "string" ? window.LIKES_API_URL.trim() : "";
  const likesEnabled = Boolean(likesApiUrl);

  if (!data) {
    app.innerHTML = `
      <div class="empty">
        <strong>Project not found:</strong> "${slug}"<br />
        Add it in <code>projects/project-details-data.js</code> and create a folder path like
        <code>projects/${slug}/index.html</code>.
      </div>
    `;
    return;
  }

  const visibilityClass = (data.visibility || "").toLowerCase() === "public" ? "public" : "internal";
  const highlights = (Array.isArray(data.highlights) ? data.highlights : []).filter(
    (item) => typeof item === "string" && item.trim().length > 0
  );
  const requirementsSource = Array.isArray(data.requirements)
    ? data.requirements
    : (Array.isArray(data.requirement) ? data.requirement : []);
  const requirements = requirementsSource.filter((item) => typeof item === "string" && item.trim().length > 0);
  const stack = (Array.isArray(data.techStack) ? data.techStack : []).filter(
    (item) => typeof item === "string" && item.trim().length > 0
  );
  const mvpSource = Array.isArray(data.mvp)
    ? data.mvp
    : (Array.isArray(data.valueProposition) ? data.valueProposition : []);
  const mvp = mvpSource.filter((item) => typeof item === "string" && item.trim().length > 0);
  const gallery = (Array.isArray(data.gallery) ? data.gallery : []).filter(
    (img) => img && typeof img.src === "string" && img.src.trim()
  );
  const links = (Array.isArray(data.links) ? data.links : []).filter(
    (link) => link && typeof link.label === "string" && link.label.trim() && typeof link.href === "string" && link.href.trim()
  );
  const deliveryTracks = (Array.isArray(data.deliveryTracks) ? data.deliveryTracks : []).filter(
    (track) => track && typeof track.name === "string" && track.name.trim().length > 0
  );
  const overviewSource = Array.isArray(data.overview)
    ? data.overview
    : (typeof data.overview === "string" ? [data.overview] : []);
  const overviewItems = overviewSource.filter((item) => typeof item === "string" && item.trim().length > 0);
  const hasOverview = overviewItems.length > 0;
  const hasRequirements = requirements.length > 0;
  const hasHighlights = highlights.length > 0;
  const hasMvp = mvp.length > 0;
  const hasStack = stack.length > 0;
  const hasCapabilityCard = hasMvp || hasStack;
  const hasLinks = links.length > 0;
  const hasGallery = gallery.length > 0;
  const hasDeliveryTracks = deliveryTracks.length > 0;
  const heroFitClass = (data.heroFit || "contain").toLowerCase() === "cover" ? "hero-fit-cover" : "hero-fit-contain";
  const headerIconSrc = data.headerIcon || data.heroImage || data.logoImage || "../../assets/images/projects/shared/logo.webp";
  const categoryLabel = hasStack ? stack[0] : (data.visibility || "Project");
  const statusLabel = data.status || "Active";
  const headerSublineClean = `${categoryLabel} | ${statusLabel}`;
  const headerFeatureLine = Array.isArray(data.headerHighlights)
    ? data.headerHighlights.filter((item) => typeof item === "string" && item.trim()).join(" | ")
    : (typeof data.headerHighlights === "string" ? data.headerHighlights.trim() : "");
  const likeKey = `projectLiked:${slug}`;
  const remoteLikeCacheKey = `projectRemoteLike:${slug}`;
  const likeEmoji = "\uD83D\uDC4D";
  const submittingEmoji = "\u23F3";

  const getSessionValue = (key, defaultValue) => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw === null ? defaultValue : raw;
    } catch (err) {
      return defaultValue;
    }
  };

  const setSessionValue = (key, value) => {
    try {
      sessionStorage.setItem(key, value);
    } catch (err) {}
  };

  const getLocalValue = (key, defaultValue) => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? defaultValue : raw;
    } catch (err) {
      return defaultValue;
    }
  };

  const setLocalValue = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (err) {}
  };

  const alreadyLiked = getSessionValue(likeKey, "0") === "1";
  const cachedRemote = parseInt(getLocalValue(remoteLikeCacheKey, ""), 10);
  const initialLikes = Number.isNaN(cachedRemote) ? (data.likes || 0) : cachedRemote;

  app.innerHTML = `
    <header class="header">
      <a class="back-btn" href="../../#projects">Back</a>
      <div class="header-center">
        <div class="title-row">
          <h1>${data.title}</h1>
          <span class="brand-link header-logo" aria-hidden="true">
            <img src="${headerIconSrc}" alt="${data.title} icon" />
          </span>
        </div>
        ${headerFeatureLine ? "" : `<p class="brand-subline">${headerSublineClean}</p>`}
        ${headerFeatureLine ? `<p class="brand-subline-secondary">${headerFeatureLine}</p>` : ""}
      </div>
      <section class="header-like card like-compact">
        <div class="like-row">
          <h2 id="like-prompt" class="${alreadyLiked || !likesEnabled ? "is-hidden" : ""}">Do you like it?</h2>
          <button
            id="like-btn"
            class="action like-emoji-btn ${alreadyLiked ? "secondary" : "primary"} ${alreadyLiked || !likesEnabled ? "is-hidden" : ""}"
            ${alreadyLiked || !likesEnabled ? "disabled" : ""}
            title="${alreadyLiked ? "Feedback submitted" : (likesEnabled ? "Submit like" : "Likes disabled")}"
            aria-label="${alreadyLiked ? "Feedback already submitted" : (likesEnabled ? "Submit like" : "Likes disabled")}"
          >
            👍
          </button>
          <p class="likes-note">Likes: <strong id="likes-count">${initialLikes}</strong></p>
        </div>
        <p id="like-status" class="like-status">
          ${alreadyLiked ? "Thank you for liking, it means a lot!" : (likesEnabled ? "" : "Likes are currently disabled to reduce backend costs.")}
        </p>
      </section>
    </header>

    <section class="hero">
      <div class="hero-media">
        <img class="hero-img ${heroFitClass}" src="${data.heroImage}" alt="${data.title}" />
      </div>
      <div class="hero-meta-strip">
        <div class="meta">
          <span class="pill ${visibilityClass}">${data.visibility || "Internal"}</span>
          <span class="pill info">Created: ${data.createdOn || "N/A"}</span>
          <span class="pill info">Status: ${data.status || "Active"}</span>
        </div>
      </div>
    </section>

    ${hasLinks ? `
    <section class="card links-strip">
      <h2>Quick Actions</h2>
      <div class="actions">
        ${links
          .map(
            (link, idx) => `
              <a
                class="action ${link.style || (idx === 0 ? "primary" : "secondary")}"
                href="${link.href}"
                ${link.external ? 'target="_blank" rel="noopener noreferrer"' : ""}
              >
                ${link.label}
              </a>
            `
          )
          .join("")}
        ${hasGallery ? `
          <a class="action gallery-jump" href="#project-gallery" data-gallery-jump="true">
            Gallery
          </a>
        ` : ""}
      </div>
    </section>` : ""}

    <section class="grid">
      ${hasOverview ? `
      <article class="card">
        <h2>Overview</h2>
        ${overviewItems.length === 1
          ? `<p>${overviewItems[0]}</p>`
          : `<ul class="list">
          ${overviewItems.map((item) => `<li>${item}</li>`).join("")}
        </ul>`}
      </article>` : ""}
      ${hasHighlights ? `
      <article class="card">
        <h2>Highlights</h2>
        <ul class="list">
          ${highlights.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </article>` : ""}
      ${hasCapabilityCard ? `
      <article class="card capability-card">
        <h2>${hasMvp ? "MVP" : "Tech Stack"}</h2>
        ${hasMvp ? `
        <ul class="list mvp-list">
          ${mvp.map((item) => `<li>${item}</li>`).join("")}
        </ul>` : ""}
        ${hasMvp && hasStack ? `<h3 class="subheading">Tech Stack</h3>` : ""}
        ${hasStack ? `
        <div class="stack">
          ${stack.map((item) => `<span class="tag">${item}</span>`).join("")}
        </div>` : ""}
      </article>` : ""}
      ${hasRequirements ? `
      <article class="card">
        <h2>Requirements</h2>
        <ul class="list">
          ${requirements.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </article>` : ""}
    </section>

    ${hasDeliveryTracks ? `
    <section class="grid">
      ${deliveryTracks
        .map((track) => {
          const problems = Array.isArray(track.problems)
            ? track.problems.filter((item) => typeof item === "string" && item.trim().length > 0)
            : [];
          const implementation = Array.isArray(track.implementation)
            ? track.implementation.filter((item) => typeof item === "string" && item.trim().length > 0)
            : [];
          const outputs = Array.isArray(track.outputs)
            ? track.outputs.filter((item) => typeof item === "string" && item.trim().length > 0)
            : [];
          const status = typeof track.status === "string" && track.status.trim().length > 0
            ? track.status.trim()
            : "N/A";
          return `
          <article class="card">
            <h2>${track.name} (${status})</h2>
            ${problems.length > 0 ? `
              <h3 class="subheading">Problems Addressed</h3>
              <ul class="list">
                ${problems.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            ` : ""}
            ${implementation.length > 0 ? `
              <h3 class="subheading">Implemented Solution</h3>
              <ul class="list">
                ${implementation.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            ` : ""}
            ${outputs.length > 0 ? `
              <h3 class="subheading">Reports / Flows</h3>
              <ul class="list">
                ${outputs.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            ` : ""}
          </article>
          `;
        })
        .join("")}
    </section>` : ""}

    ${hasGallery ? `
    <section id="project-gallery" class="card gallery-card">
      <h2>Gallery</h2>
      <div class="gallery">
        ${gallery
          .map(
            (img) =>
              `<img class="gallery-image" src="${img.src}" alt="${img.alt || data.title}" loading="lazy" />`
          )
          .join("")}
      </div>
    </section>` : ""}
  `;

  const likeBtn = document.getElementById("like-btn");
  const likesCount = document.getElementById("likes-count");
  const likeStatus = document.getElementById("like-status");
  const likePrompt = document.getElementById("like-prompt");

  window.addEventListener("storage", (event) => {
    if (event.key === themeStorageKey) {
      applyTheme(event.newValue === "light" ? "light" : "dark");
    }
  });

  const syncLikeCount = async () => {
    if (!likesEnabled) return;
    try {
      const response = await fetch(
        `${likesApiUrl}?slug=${encodeURIComponent(slug)}&ts=${Date.now()}`,
        { cache: "no-store" }
      );
      const result = await response.json();
      const count = Number(result.count);
      if (!Number.isNaN(count) && likesCount) {
        likesCount.textContent = String(count);
        setLocalValue(remoteLikeCacheKey, String(count));
      }
    } catch (err) {}
  };

  const incrementLike = async () => {
    if (!likesEnabled) {
      throw new Error("Likes are disabled");
    }
    const response = await fetch(likesApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({ slug })
    });
    const result = await response.json();
    const count = Number(result.count);
    if (Number.isNaN(count)) {
      throw new Error("Invalid like count response");
    }
    return count;
  };

  syncLikeCount();

  let galleryLightboxIndex = -1;
  let galleryZoom = 1;
  let galleryPanX = 0;
  let galleryPanY = 0;
  let galleryDragState = null;
  let gallerySwipeState = null;
  const galleryActivePointers = new Map();
  let galleryPinchState = null;
  const galleryMinZoom = 1;
  const galleryMaxZoom = 4;
  const galleryZoomStep = 0.25;
  const gallerySwipeThresholdPx = 48;
  const gallerySwipeAxisRatio = 1.2;
  const galleryImageElements = Array.from(app.querySelectorAll(".gallery-image"));
  let galleryOverlayEl = null;
  let galleryLightboxContentEl = null;
  let galleryLightboxImageEl = null;
  let galleryLightboxZoomReadoutEl = null;
  let galleryHistoryActive = false;
  let galleryIgnoreNextPopstate = false;

  const getWrappedGalleryIndex = (index) => {
    const total = galleryImageElements.length;
    if (total <= 0) return -1;
    return ((index % total) + total) % total;
  };

  const clearGalleryDomRefs = () => {
    galleryOverlayEl = null;
    galleryLightboxContentEl = null;
    galleryLightboxImageEl = null;
    galleryLightboxZoomReadoutEl = null;
  };

  const updateGalleryLightboxTransform = () => {
    if (!galleryOverlayEl || !galleryOverlayEl.isConnected || !galleryLightboxImageEl) return;
    galleryLightboxImageEl.style.transform = `translate(${galleryPanX}px, ${galleryPanY}px) scale(${galleryZoom})`;
    galleryLightboxImageEl.classList.toggle("is-gesturing", Boolean(galleryDragState || galleryPinchState));
    galleryLightboxImageEl.style.cursor = galleryZoom > 1 ? (galleryDragState ? "grabbing" : "grab") : "zoom-in";
    if (galleryLightboxZoomReadoutEl) {
      galleryLightboxZoomReadoutEl.textContent = `${Math.round(galleryZoom * 100)}%`;
    }
  };

  const getTouchPinchSnapshot = () => {
    const points = Array.from(galleryActivePointers.values());
    if (points.length < 2) return null;
    const [a, b] = points;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return {
      distance: Math.hypot(dx, dy),
      centerX: (a.x + b.x) / 2,
      centerY: (a.y + b.y) / 2
    };
  };

  const beginTouchPinch = (imgEl) => {
    const snapshot = getTouchPinchSnapshot();
    if (!snapshot || !imgEl) return;
    const rect = imgEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const baseZoom = Math.max(0.001, galleryZoom);
    galleryPinchState = {
      startDistance: Math.max(1, snapshot.distance),
      startZoom: galleryZoom,
      imageCenterX: centerX,
      imageCenterY: centerY,
      localX: (snapshot.centerX - centerX - galleryPanX) / baseZoom,
      localY: (snapshot.centerY - centerY - galleryPanY) / baseZoom
    };
    galleryDragState = null;
    updateGalleryLightboxTransform();
  };

  const resetGalleryZoom = () => {
    galleryZoom = 1;
    galleryPanX = 0;
    galleryPanY = 0;
    galleryDragState = null;
    gallerySwipeState = null;
    galleryPinchState = null;
    updateGalleryLightboxTransform();
  };

  const setGalleryZoom = (nextZoom, anchorClientX = null, anchorClientY = null) => {
    const prevZoom = galleryZoom;
    const safeZoom = Math.max(galleryMinZoom, Math.min(galleryMaxZoom, nextZoom));
    if (
      Number.isFinite(anchorClientX) &&
      Number.isFinite(anchorClientY) &&
      prevZoom > 0 &&
      safeZoom > galleryMinZoom &&
      galleryLightboxImageEl
    ) {
      const rect = galleryLightboxImageEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const localX = (anchorClientX - centerX - galleryPanX) / prevZoom;
      const localY = (anchorClientY - centerY - galleryPanY) / prevZoom;
      galleryPanX = anchorClientX - centerX - localX * safeZoom;
      galleryPanY = anchorClientY - centerY - localY * safeZoom;
    }
    galleryZoom = safeZoom;
    if (galleryZoom <= galleryMinZoom) {
      galleryPanX = 0;
      galleryPanY = 0;
      galleryDragState = null;
      galleryPinchState = null;
    }
    updateGalleryLightboxTransform();
  };

  const isGalleryGestureControlTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        ".gallery-lightbox-close, .gallery-lightbox-nav, .gallery-lightbox-zoom-controls, .gallery-lightbox-zoom-btn, .gallery-lightbox-zoom-readout"
      )
    );
  };

  const onGalleryLightboxKeydown = (e) => {
    if (e.key === "Escape") {
      closeGalleryLightbox({ syncHistory: true });
      return;
    }
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setGalleryZoom(galleryZoom + galleryZoomStep);
      return;
    }
    if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      setGalleryZoom(galleryZoom - galleryZoomStep);
      return;
    }
    if (e.key === "0") {
      e.preventDefault();
      resetGalleryZoom();
      return;
    }
    if (galleryImageElements.length <= 1) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      openGalleryLightboxByIndex(galleryLightboxIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      openGalleryLightboxByIndex(galleryLightboxIndex - 1);
    }
  };

  const pushGalleryHistoryState = () => {
    if (galleryHistoryActive) return;
    if (!window.history || typeof window.history.pushState !== "function") return;
    try {
      const nextUrl = `${window.location.pathname}${window.location.search}#gallery`;
      window.history.pushState({ ...(window.history.state || {}), galleryLightbox: true }, "", nextUrl);
      galleryHistoryActive = true;
    } catch (err) {}
  };

  const closeGalleryLightbox = ({ syncHistory = false, keepHistoryState = false } = {}) => {
    const overlay = galleryOverlayEl || document.getElementById("gallery-lightbox");
    if (!overlay) return;
    overlay.remove();
    clearGalleryDomRefs();
    document.body.classList.remove("no-scroll");
    document.removeEventListener("keydown", onGalleryLightboxKeydown);
    galleryDragState = null;
    gallerySwipeState = null;
    galleryPinchState = null;
    galleryActivePointers.clear();

    if (syncHistory && galleryHistoryActive) {
      galleryHistoryActive = false;
      if (window.history && typeof window.history.back === "function") {
        galleryIgnoreNextPopstate = true;
        window.history.back();
      }
      return;
    }

    if (!keepHistoryState) {
      galleryHistoryActive = false;
    }
  };

  const openGalleryLightboxByIndex = (requestedIndex) => {
    if (galleryImageElements.length === 0) return;
    const safeIndex = getWrappedGalleryIndex(requestedIndex);
    const targetImage = galleryImageElements[safeIndex];
    if (!targetImage) return;
    const src = targetImage.src;
    const altText = targetImage.alt || data.title;
    galleryLightboxIndex = safeIndex;
    const wasOpen = Boolean(galleryOverlayEl && galleryOverlayEl.isConnected);

    if (!wasOpen) {
      pushGalleryHistoryState();
    }

    closeGalleryLightbox({ keepHistoryState: true });
    resetGalleryZoom();

    const totalImages = galleryImageElements.length;
    const canNavigate = totalImages > 1;

    const overlay = document.createElement("div");
    overlay.id = "gallery-lightbox";
    overlay.className = "gallery-lightbox";
    overlay.innerHTML = `
      <div class="gallery-lightbox-backdrop" data-close-lightbox="true"></div>
      <figure class="gallery-lightbox-content" role="dialog" aria-modal="true" aria-label="Gallery image preview">
        <button class="gallery-lightbox-close" type="button" aria-label="Close image preview">&times;</button>
        <div class="gallery-lightbox-zoom-controls" aria-label="Zoom controls">
          <button class="gallery-lightbox-zoom-btn" type="button" data-zoom="out" aria-label="Zoom out">-</button>
          <button class="gallery-lightbox-zoom-readout" type="button" data-zoom="reset" aria-label="Reset zoom">100%</button>
          <button class="gallery-lightbox-zoom-btn" type="button" data-zoom="in" aria-label="Zoom in">+</button>
        </div>
        ${canNavigate ? `<button class="gallery-lightbox-nav prev" type="button" data-nav="prev" aria-label="Previous image">&#8249;</button>` : ""}
        ${canNavigate ? `<button class="gallery-lightbox-nav next" type="button" data-nav="next" aria-label="Next image">&#8250;</button>` : ""}
        <img class="gallery-lightbox-image" src="${src}" alt="${altText || data.title}" />
        ${canNavigate ? `<figcaption class="gallery-lightbox-count">${safeIndex + 1} / ${totalImages}</figcaption>` : ""}
      </figure>
    `;

    overlay.addEventListener("click", (e) => {
      if (!e.target) return;
      if (e.target.dataset.closeLightbox === "true" || e.target.classList.contains("gallery-lightbox-close")) {
        closeGalleryLightbox({ syncHistory: true });
        return;
      }
      if (e.target.dataset.nav === "next") {
        openGalleryLightboxByIndex(galleryLightboxIndex + 1);
        return;
      }
      if (e.target.dataset.nav === "prev") {
        openGalleryLightboxByIndex(galleryLightboxIndex - 1);
        return;
      }
      if (e.target.dataset.zoom === "in") {
        setGalleryZoom(galleryZoom + galleryZoomStep);
        return;
      }
      if (e.target.dataset.zoom === "out") {
        setGalleryZoom(galleryZoom - galleryZoomStep);
        return;
      }
      if (e.target.dataset.zoom === "reset") {
        resetGalleryZoom();
      }
    });

    document.body.appendChild(overlay);
    document.body.classList.add("no-scroll");
    document.addEventListener("keydown", onGalleryLightboxKeydown);

    galleryOverlayEl = overlay;
    galleryLightboxContentEl = overlay.querySelector(".gallery-lightbox-content");
    galleryLightboxImageEl = overlay.querySelector(".gallery-lightbox-image");
    galleryLightboxZoomReadoutEl = overlay.querySelector(".gallery-lightbox-zoom-readout");

    const content = galleryLightboxContentEl;
    const zoomImage = galleryLightboxImageEl;

    if (content) {
      content.addEventListener("wheel", (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
          setGalleryZoom(galleryZoom + galleryZoomStep, e.clientX, e.clientY);
        } else {
          setGalleryZoom(galleryZoom - galleryZoomStep, e.clientX, e.clientY);
        }
      }, { passive: false });
    }

    if (content && zoomImage) {
      content.addEventListener("dblclick", (e) => {
        if (isGalleryGestureControlTarget(e.target)) return;
        e.preventDefault();
        if (galleryZoom > 1) {
          resetGalleryZoom();
        } else {
          setGalleryZoom(2, e.clientX, e.clientY);
        }
      });

      content.addEventListener("pointerdown", (e) => {
        if (isGalleryGestureControlTarget(e.target)) return;
        if (typeof content.setPointerCapture === "function") {
          content.setPointerCapture(e.pointerId);
        }
        if (e.pointerType === "touch") {
          galleryActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (galleryActivePointers.size >= 2) {
            e.preventDefault();
            gallerySwipeState = null;
            beginTouchPinch(zoomImage);
            return;
          }
          if (galleryZoom <= galleryMinZoom) {
            gallerySwipeState = {
              pointerId: e.pointerId,
              startX: e.clientX,
              startY: e.clientY,
              lastX: e.clientX,
              lastY: e.clientY
            };
            return;
          }
        } else if (galleryZoom <= 1) {
          return;
        }
        e.preventDefault();
        gallerySwipeState = null;
        galleryPinchState = null;
        galleryDragState = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          originX: galleryPanX,
          originY: galleryPanY
        };
        updateGalleryLightboxTransform();
      });

      content.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch" && galleryActivePointers.has(e.pointerId)) {
          galleryActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }
        if (galleryPinchState) {
          const snapshot = getTouchPinchSnapshot();
          if (!snapshot) return;
          e.preventDefault();
          const scale = snapshot.distance / Math.max(1, galleryPinchState.startDistance);
          const nextZoom = Math.max(galleryMinZoom, Math.min(galleryMaxZoom, galleryPinchState.startZoom * scale));
          galleryZoom = nextZoom;
          if (galleryZoom <= galleryMinZoom) {
            galleryPanX = 0;
            galleryPanY = 0;
            galleryDragState = null;
            galleryPinchState = null;
            updateGalleryLightboxTransform();
            return;
          }
          galleryPanX = snapshot.centerX - galleryPinchState.imageCenterX - (galleryPinchState.localX * galleryZoom);
          galleryPanY = snapshot.centerY - galleryPinchState.imageCenterY - (galleryPinchState.localY * galleryZoom);
          updateGalleryLightboxTransform();
          return;
        }
        if (
          e.pointerType === "touch" &&
          gallerySwipeState &&
          gallerySwipeState.pointerId === e.pointerId &&
          galleryActivePointers.size === 1 &&
          galleryZoom <= galleryMinZoom
        ) {
          gallerySwipeState.lastX = e.clientX;
          gallerySwipeState.lastY = e.clientY;
          const dx = e.clientX - gallerySwipeState.startX;
          const dy = e.clientY - gallerySwipeState.startY;
          if (Math.abs(dx) > Math.abs(dy) * gallerySwipeAxisRatio && Math.abs(dx) > 10) {
            e.preventDefault();
          }
          return;
        }
        if (!galleryDragState || galleryDragState.pointerId !== e.pointerId) return;
        e.preventDefault();
        galleryPanX = galleryDragState.originX + (e.clientX - galleryDragState.startX);
        galleryPanY = galleryDragState.originY + (e.clientY - galleryDragState.startY);
        updateGalleryLightboxTransform();
      });

      const finishDrag = (e) => {
        if (e.pointerType === "touch") {
          const activeSwipeState = gallerySwipeState && gallerySwipeState.pointerId === e.pointerId ? gallerySwipeState : null;
          if (
            activeSwipeState &&
            !galleryPinchState &&
            galleryZoom <= galleryMinZoom &&
            galleryImageElements.length > 1
          ) {
            const dx = (Number.isFinite(e.clientX) ? e.clientX : activeSwipeState.lastX) - activeSwipeState.startX;
            const dy = (Number.isFinite(e.clientY) ? e.clientY : activeSwipeState.lastY) - activeSwipeState.startY;
            if (Math.abs(dx) >= gallerySwipeThresholdPx && Math.abs(dx) > Math.abs(dy) * gallerySwipeAxisRatio) {
              gallerySwipeState = null;
              galleryActivePointers.delete(e.pointerId);
              openGalleryLightboxByIndex(galleryLightboxIndex + (dx < 0 ? 1 : -1));
              return;
            }
          }
          galleryActivePointers.delete(e.pointerId);
          if (galleryActivePointers.size >= 2) {
            gallerySwipeState = null;
            beginTouchPinch(zoomImage);
            return;
          }
          if (galleryPinchState) {
            galleryPinchState = null;
            const remainingEntry = galleryActivePointers.entries().next().value || [];
            const remainingPointerId = remainingEntry[0] ?? null;
            const remainingPointer = remainingEntry[1] ?? null;
            if (remainingPointer && galleryZoom > galleryMinZoom) {
              galleryDragState = {
                pointerId: remainingPointerId,
                startX: remainingPointer.x,
                startY: remainingPointer.y,
                originX: galleryPanX,
                originY: galleryPanY
              };
            } else {
              galleryDragState = null;
            }
            updateGalleryLightboxTransform();
            return;
          }
          if (gallerySwipeState && gallerySwipeState.pointerId === e.pointerId) {
            gallerySwipeState = null;
          }
        }
        if (galleryDragState && (!e || galleryDragState.pointerId === e.pointerId)) {
          galleryDragState = null;
        }
        updateGalleryLightboxTransform();
      };

      content.addEventListener("pointerup", finishDrag);
      content.addEventListener("pointercancel", finishDrag);
      content.addEventListener("pointerleave", (e) => {
        if (e.pointerType === "touch") return;
        finishDrag(e);
      });
    }

    updateGalleryLightboxTransform();
  };

  const onGalleryPopstate = () => {
    if (galleryIgnoreNextPopstate) {
      galleryIgnoreNextPopstate = false;
      return;
    }
    const isOpen = Boolean(galleryOverlayEl && galleryOverlayEl.isConnected) || Boolean(document.getElementById("gallery-lightbox"));
    if (isOpen) {
      closeGalleryLightbox({ syncHistory: false, keepHistoryState: false });
    }
  };
  window.addEventListener("popstate", onGalleryPopstate);

  galleryImageElements.forEach((imgEl, idx) => {
    imgEl.addEventListener("click", () => openGalleryLightboxByIndex(idx));
  });

  app.querySelectorAll("[data-gallery-jump='true']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById("project-gallery");
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.remove("gallery-arrive");
      window.setTimeout(() => target.classList.add("gallery-arrive"), 320);
      window.setTimeout(() => target.classList.remove("gallery-arrive"), 1450);
    });
  });

  if (likeBtn && likesCount) {
    likeBtn.textContent = likeEmoji;
    likeBtn.addEventListener("click", async () => {
      if (!likesEnabled) return;
      const liked = getSessionValue(likeKey, "0") === "1";
      if (liked) return;

      likeBtn.setAttribute("disabled", "true");
      if (likeStatus) likeStatus.textContent = "Submitting your feedback...";
      likeBtn.textContent = submittingEmoji;

      try {
        const newCount = await incrementLike();
        likesCount.textContent = String(newCount);
        setLocalValue(remoteLikeCacheKey, String(newCount));
        setSessionValue(likeKey, "1");
        likeBtn.classList.remove("primary");
        likeBtn.classList.add("secondary");
        likeBtn.classList.add("is-hidden");
        if (likePrompt) likePrompt.classList.add("is-hidden");
        likeBtn.setAttribute("title", "Feedback submitted");
        likeBtn.setAttribute("aria-label", "Feedback already submitted");
        likeBtn.textContent = likeEmoji;
        if (likeStatus) likeStatus.textContent = "Thank you for liking, it means a lot!";
        if (typeof window.showLikeThankYouOverlay === "function") {
          window.showLikeThankYouOverlay();
        }
      } catch (err) {
        likeBtn.removeAttribute("disabled");
        if (likeStatus) likeStatus.textContent = "Could not submit right now. Please try again.";
        likeBtn.textContent = likeEmoji;
      }
    });
  }
})();
