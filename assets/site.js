(function () {
  function isExternal(href) {
    if (!href) return false;
    if (
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) {
      return false;
    }
    if (href.startsWith("/") && !href.startsWith("//")) return false;
    try {
      return new URL(href, window.location.href).origin !== window.location.origin;
    } catch (_e) {
      return false;
    }
  }

  document.querySelectorAll("a[href]").forEach(function (link) {
    if (!isExternal(link.getAttribute("href"))) return;
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });

  document.querySelectorAll(".intro-gallery").forEach(function (gallery) {
    var track = gallery.querySelector(".intro-gallery__track");
    var slides = gallery.querySelectorAll(".intro-gallery__slide");
    var prevBtn = gallery.querySelector(".intro-gallery__btn--prev");
    var nextBtn = gallery.querySelector(".intro-gallery__btn--next");
    var dotsContainer = gallery.querySelector(".intro-gallery__dots");

    if (!track || slides.length === 0) return;

    var count = slides.length;

    if (count < 2) {
      if (prevBtn) prevBtn.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
      if (dotsContainer) dotsContainer.hidden = true;
      return;
    }

    var firstClone = slides[0].cloneNode(true);
    var lastClone = slides[count - 1].cloneNode(true);
    firstClone.setAttribute("aria-hidden", "true");
    lastClone.setAttribute("aria-hidden", "true");
    firstClone.classList.add("intro-gallery__slide--clone");
    lastClone.classList.add("intro-gallery__slide--clone");
    track.insertBefore(lastClone, slides[0]);
    track.appendChild(firstClone);

    var index = 0;
    var snapTimer = null;
    var isSnapping = false;

    if (dotsContainer) {
      slides.forEach(function (_slide, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "intro-gallery__dot";
        dot.setAttribute("aria-label", "Go to photo " + (i + 1));
        dot.addEventListener("click", function () {
          goToReal(i, true);
        });
        dotsContainer.appendChild(dot);
      });
    }

    var dots = dotsContainer
      ? dotsContainer.querySelectorAll(".intro-gallery__dot")
      : [];

    function slideOffset(scrollIndex) {
      return scrollIndex * track.clientWidth;
    }

    function scrollToIndex(scrollIndex, smooth) {
      isSnapping = true;
      track.scrollTo({
        left: slideOffset(scrollIndex),
        behavior: smooth === false ? "auto" : "smooth",
      });
      window.setTimeout(function () {
        isSnapping = false;
      }, smooth === false ? 0 : 350);
    }

    function jumpToReal(realIndex) {
      index = realIndex;
      isSnapping = true;
      track.scrollLeft = slideOffset(realIndex + 1);
      updateUI();
      isSnapping = false;
    }

    function goToReal(realIndex, smooth) {
      index = realIndex;
      scrollToIndex(realIndex + 1, smooth);
      updateUI();
    }

    function goNext(smooth) {
      if (index === count - 1) {
        jumpToReal(0);
      } else {
        goToReal(index + 1, smooth);
      }
    }

    function goPrev(smooth) {
      if (index === 0) {
        jumpToReal(count - 1);
      } else {
        goToReal(index - 1, smooth);
      }
    }

    function nearestScrollIndex() {
      var trackWidth = track.clientWidth || 1;
      return Math.round(track.scrollLeft / trackWidth);
    }

    function normalizeAfterScroll() {
      var scrollIndex = nearestScrollIndex();
      if (scrollIndex === 0) {
        index = count - 1;
        track.scrollLeft = slideOffset(count);
      } else if (scrollIndex === count + 1) {
        index = 0;
        track.scrollLeft = slideOffset(1);
      } else {
        index = scrollIndex - 1;
      }
      updateUI();
    }

    function snapToNearest() {
      var scrollIndex = nearestScrollIndex();
      if (scrollIndex === 0 || scrollIndex === count + 1) {
        normalizeAfterScroll();
        return;
      }
      if (Math.abs(track.scrollLeft - slideOffset(scrollIndex)) > 1) {
        scrollToIndex(scrollIndex, true);
        index = scrollIndex - 1;
        updateUI();
      } else {
        index = scrollIndex - 1;
        track.scrollLeft = slideOffset(scrollIndex);
        updateUI();
      }
    }

    function syncIndexFromScroll() {
      if (isSnapping) return;
      var scrollIndex = nearestScrollIndex();
      if (scrollIndex >= 1 && scrollIndex <= count) {
        index = scrollIndex - 1;
        updateUI();
      }
    }

    function stabilizeRectCaption() {
      if (!gallery.classList.contains("intro-gallery--rect")) return;

      var captionEl = gallery.querySelector(".intro-gallery__caption");
      if (!captionEl) return;

      var saved = captionEl.innerHTML;
      var maxH = 0;
      slides.forEach(function (slide) {
        var source = slide.querySelector("figcaption");
        if (!source) return;
        captionEl.innerHTML = source.innerHTML;
        maxH = Math.max(maxH, captionEl.getBoundingClientRect().height);
      });
      captionEl.style.minHeight = Math.ceil(maxH) + "px";
      captionEl.innerHTML = saved;
    }

    function updateUI() {
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === index);
      });

      var captionEl = gallery.querySelector(".intro-gallery__caption");
      var source = slides[index] && slides[index].querySelector("figcaption");
      if (captionEl && source) {
        captionEl.innerHTML = source.innerHTML;
      }
    }

    gallery._stabilizeRectCaption = stabilizeRectCaption;

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goPrev(true);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goNext(true);
      });
    }

    track.addEventListener(
      "scroll",
      function () {
        syncIndexFromScroll();
        window.clearTimeout(snapTimer);
        snapTimer = window.setTimeout(snapToNearest, 120);
      },
      { passive: true }
    );

    track.addEventListener("scrollend", function () {
      var scrollIndex = nearestScrollIndex();
      if (scrollIndex === 0 || scrollIndex === count + 1) {
        normalizeAfterScroll();
      } else if (!isSnapping) {
        snapToNearest();
      }
    });

    gallery._introGalleryReset = function () {
      index = 0;
      track.scrollLeft = slideOffset(1);
      stabilizeRectCaption();
      updateUI();
    };

    window.addEventListener("resize", function () {
      track.scrollLeft = slideOffset(index + 1);
    });

    stabilizeRectCaption();
    updateUI();
    track.scrollLeft = slideOffset(1);
  });

  var rectCaptionTimer = null;
  function remeasureRectCaptions() {
    document.querySelectorAll(".intro-gallery--rect").forEach(function (gallery) {
      if (typeof gallery._stabilizeRectCaption === "function") {
        gallery._stabilizeRectCaption();
      }
    });
  }

  window.addEventListener("resize", function () {
    window.clearTimeout(rectCaptionTimer);
    rectCaptionTimer = window.setTimeout(remeasureRectCaptions, 120);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(remeasureRectCaptions);
  }

  document.querySelectorAll(".summary-panel").forEach(function (panel) {
    var summary = panel.querySelector(".summary");
    var rail = panel.querySelector(".summary-rail");
    if (!summary || !rail) return;

    var thumb = document.createElement("div");
    thumb.className = "summary-thumb";
    rail.appendChild(thumb);

    var dragState = null;
    var scrollHideTimer = null;

    function setScrolling() {
      panel.classList.add("is-scrolling");
      window.clearTimeout(scrollHideTimer);
      scrollHideTimer = window.setTimeout(function () {
        panel.classList.remove("is-scrolling");
      }, 800);
    }

    function updateScrollState() {
      var metrics = scrollMetrics();
      panel.classList.toggle(
        "has-scroll",
        metrics.scrollHeight > metrics.clientHeight + 1
      );
    }

    function scrollMetrics() {
      var scrollHeight = summary.scrollHeight;
      var clientHeight = summary.clientHeight;
      return {
        scrollHeight: scrollHeight,
        clientHeight: clientHeight,
        maxScroll: Math.max(0, scrollHeight - clientHeight),
      };
    }

    function thumbMetrics() {
      var metrics = scrollMetrics();
      var railHeight = rail.clientHeight;
      var thumbHeight = Math.max(
        32,
        (metrics.clientHeight / metrics.scrollHeight) * railHeight
      );
      var inset = 4;
      var maxTop = Math.max(0, railHeight - thumbHeight - inset * 2);
      return {
        railHeight: railHeight,
        thumbHeight: thumbHeight,
        inset: inset,
        maxTop: maxTop,
      };
    }

    function updateThumb() {
      var metrics = scrollMetrics();
      updateScrollState();
      if (metrics.scrollHeight <= metrics.clientHeight + 1) {
        thumb.style.display = "none";
        return;
      }

      thumb.style.display = "block";
      var thumbInfo = thumbMetrics();
      var top =
        thumbInfo.inset +
        (metrics.maxScroll > 0
          ? (summary.scrollTop / metrics.maxScroll) * thumbInfo.maxTop
          : 0);
      thumb.style.height = thumbInfo.thumbHeight + "px";
      thumb.style.top = top + "px";
    }

    function scrollFromThumbTop(top) {
      var metrics = scrollMetrics();
      var thumbInfo = thumbMetrics();
      var clampedTop = Math.max(
        thumbInfo.inset,
        Math.min(thumbInfo.maxTop + thumbInfo.inset, top)
      );
      var ratio =
        thumbInfo.maxTop > 0
          ? (clampedTop - thumbInfo.inset) / thumbInfo.maxTop
          : 0;
      summary.scrollTop = ratio * metrics.maxScroll;
    }

    thumb.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      dragState = {
        startY: e.clientY,
        startThumbTop: thumb.offsetTop,
      };
      thumb.setPointerCapture(e.pointerId);
      thumb.classList.add("is-dragging");
      panel.classList.add("is-dragging");
    });

    thumb.addEventListener("pointermove", function (e) {
      if (!dragState) return;
      e.preventDefault();
      scrollFromThumbTop(
        dragState.startThumbTop + (e.clientY - dragState.startY)
      );
    });

    function endDrag(e) {
      if (!dragState) return;
      dragState = null;
      thumb.classList.remove("is-dragging");
      panel.classList.remove("is-dragging");
      setScrolling();
      try {
        thumb.releasePointerCapture(e.pointerId);
      } catch (_e) {}
    }

    thumb.addEventListener("pointerup", endDrag);
    thumb.addEventListener("pointercancel", endDrag);

    rail.addEventListener("pointerdown", function (e) {
      if (e.target !== rail) return;
      var rect = rail.getBoundingClientRect();
      var thumbInfo = thumbMetrics();
      scrollFromThumbTop(e.clientY - rect.top - thumbInfo.thumbHeight / 2);
    });

    summary.addEventListener("scroll", function () {
      updateThumb();
      setScrolling();
    }, { passive: true });
    window.addEventListener("resize", updateThumb);
    updateThumb();
  });

  document.querySelectorAll(".news-archive").forEach(function (archive) {
    archive.addEventListener("toggle", function () {
      if (archive.open) {
        archive.querySelectorAll(".intro-gallery").forEach(function (gallery) {
          if (gallery._introGalleryReset) {
            gallery._introGalleryReset();
          } else {
            var track = gallery.querySelector(".intro-gallery__track");
            if (track) {
              track.scrollLeft = 0;
              track.dispatchEvent(new Event("scroll"));
            }
          }
        });
      }
      window.dispatchEvent(new Event("resize"));
    });
  });

  var miscDetails = document.getElementById("misc");
  if (miscDetails && window.location.hash === "#misc") {
    miscDetails.setAttribute("open", "");
    window.requestAnimationFrame(function () {
      var gallery = miscDetails.querySelector(".intro-gallery");
      if (gallery && gallery._introGalleryReset) {
        gallery._introGalleryReset();
      }
    });
  }

  function fullLogoWidth(logo) {
    var mark = logo.querySelector(".logo__mark");
    var text = logo.querySelector(".logo__text");
    var cursor = logo.querySelector(".logo__cursor");
    var width = 0;
    if (mark) width += mark.offsetWidth;
    if (text) width += text.scrollWidth;
    if (cursor) width += cursor.offsetWidth;
    return width || logo.scrollWidth;
  }

  function navNeedsMenuButton() {
    if (window.matchMedia("(max-width: 768px)").matches) return true;

    var logo = document.querySelector(".header .logo");
    var desktop = document.querySelector(".menu__inner--desktop");
    var headerInner = document.querySelector(".header__inner");
    var headerRight = document.querySelector(".header__right");
    var trigger = document.querySelector(".menu-trigger");
    var themeToggle = document.querySelector(".theme-toggle");
    var menu = document.querySelector(".menu");
    if (!logo || !desktop || !headerInner || !headerRight) return false;

    var available = headerInner.clientWidth;
    var gap = 12;
    var logoWidth = fullLogoWidth(logo);
    var chrome = 16;

    if (menu) {
      var ms = window.getComputedStyle(menu);
      chrome +=
        parseFloat(ms.marginRight || 0) +
        parseFloat(ms.paddingRight || 0) +
        parseFloat(ms.borderRightWidth || 0);
    }

    var utilities =
      (trigger ? trigger.offsetWidth : 24) +
      (themeToggle ? themeToggle.offsetWidth : 24);
    var tabsWidth = desktop.scrollWidth;
    var expandedRight = tabsWidth + chrome + utilities;

    if (logoWidth + gap + expandedRight > available + 1) return true;

    var logoRect = logo.getBoundingClientRect();
    var rightRect = headerRight.getBoundingClientRect();
    if (logoRect.right > rightRect.left - 8) return true;

    return false;
  }

  function updateNavCollapse() {
    var header = document.querySelector(".header");
    var menu = document.querySelector(".menu");
    var trigger = document.querySelector(".menu-trigger");
    if (!header || !menu || !trigger) return;

    var forceMobile = window.matchMedia("(max-width: 768px)").matches;
    var collapsed;

    if (forceMobile) {
      collapsed = true;
    } else {
      if (header.classList.contains("nav-collapsed")) {
        header.classList.remove("nav-collapsed");
        trigger.classList.add("hidden");
        menu.classList.remove("hidden");
        menu.classList.remove("nav-open");
      }
      collapsed = navNeedsMenuButton();
    }

    header.classList.toggle("nav-collapsed", collapsed);

    if (collapsed) {
      trigger.classList.remove("hidden");
      menu.classList.remove("nav-open");
      menu.classList.add("hidden");
    } else {
      trigger.classList.add("hidden");
      menu.classList.remove("hidden");
      menu.classList.remove("nav-open");
    }
  }

  var menu = document.querySelector(".menu");
  var trigger = document.querySelector(".menu-trigger");

  if (trigger && menu) {
    trigger.addEventListener(
      "click",
      function (e) {
        var header = document.querySelector(".header");
        if (!header || !header.classList.contains("nav-collapsed")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        var open = !menu.classList.contains("nav-open");
        menu.classList.toggle("nav-open", open);
        menu.classList.toggle("hidden", !open);
      },
      true
    );

    menu.addEventListener("click", function (e) {
      if (!e.target.closest("a")) return;
      menu.classList.remove("nav-open");
      menu.classList.add("hidden");
    });
  }

  document.body.addEventListener("click", function () {
    var header = document.querySelector(".header");
    if (
      header &&
      header.classList.contains("nav-collapsed") &&
      menu &&
      menu.classList.contains("nav-open")
    ) {
      menu.classList.remove("nav-open");
      menu.classList.add("hidden");
    }
  });

  window.addEventListener("resize", function () {
    window.requestAnimationFrame(function () {
      updateNavCollapse();
      window.requestAnimationFrame(updateNavCollapse);
    });
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateNavCollapse);
  }

  if (typeof ResizeObserver !== "undefined") {
    var headerInner = document.querySelector(".header__inner");
    if (headerInner) {
      new ResizeObserver(function () {
        window.requestAnimationFrame(updateNavCollapse);
      }).observe(headerInner);
    }

    var logo = document.querySelector(".header .logo");
    if (logo) {
      new ResizeObserver(function () {
        window.requestAnimationFrame(updateNavCollapse);
      }).observe(logo);
    }
  }

  updateNavCollapse();

  window.addEventListener("load", function () {
    updateNavCollapse();
  });
})();
