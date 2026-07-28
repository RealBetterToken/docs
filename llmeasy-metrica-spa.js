(function () {
  'use strict';

  var productionHostname = 'docs.bettertoken.ai';

  if (window.location.hostname !== productionHostname) {
    return;
  }

  if (window.__bettertokenDocsAnalyticsInstalled) {
    return;
  }

  window.__bettertokenDocsAnalyticsInstalled = true;

  var gtmId = 'GTM-KXQ798MR';
  var counterId = 110565477;
  var pollIntervalMs = 50;
  var titleFallbackMs = 1000;
  var trackerTimeoutMs = 15000;
  var navigationVersion = 0;
  var lastReportedPage = pageKey();
  var lastReportedTitle = document.title;
  var claritySurfaceIsSet = false;
  var pendingClarityEvents = [];
  var pendingMetricaGoals = [];
  var trackerPollTimer = null;
  var trackerPollStartedAt = 0;

  function loadGtmOnce() {
    window.dataLayer = window.dataLayer || [];

    var existingScript = document.querySelector(
      'script[src*="googletagmanager.com/gtm.js?id=' + gtmId + '"]'
    );

    if (existingScript || window.__bettertokenGtmLoaded) {
      window.__bettertokenGtmLoaded = true;
      return;
    }

    window.__bettertokenGtmLoaded = true;
    window.dataLayer.push({
      'gtm.start': Date.now(),
      event: 'gtm.js',
    });

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + gtmId;
    script.setAttribute('data-bettertoken-gtm', gtmId);
    (document.head || document.documentElement).appendChild(script);
  }

  function installGtagQueue() {
    window.dataLayer = window.dataLayer || [];

    if (typeof window.gtag !== 'function') {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }
  }

  function pageKey() {
    return window.location.origin + normalizePath(window.location.pathname);
  }

  function safePageUrl() {
    return window.location.origin + normalizePath(window.location.pathname);
  }

  function normalizePath(value) {
    var pathname = value || '/';

    try {
      pathname = new URL(pathname, window.location.origin).pathname;
    } catch (_error) {
      // Keep the original value if the path cannot be parsed as a URL.
    }

    return pathname.replace(/\/+$/, '') || '/';
  }

  function routeContentIsReady(elapsedMs) {
    var currentPath = document.documentElement.getAttribute('data-current-path');
    var pathIsReady = currentPath
      ? normalizePath(currentPath) === normalizePath(window.location.pathname)
      : elapsedMs >= 250;
    var titleIsReady = Boolean(document.title)
      && (document.title !== lastReportedTitle || elapsedMs >= titleFallbackMs);

    return pathIsReady && titleIsReady;
  }

  function reportRouteChange() {
    var targetPage = pageKey();

    if (targetPage === lastReportedPage) {
      return;
    }

    var version = ++navigationVersion;
    var startedAt = Date.now();

    function reportWhenReady() {
      if (version !== navigationVersion) {
        return;
      }

      if (pageKey() !== targetPage) {
        reportRouteChange();
        return;
      }

      var elapsedMs = Date.now() - startedAt;
      var trackerIsReady = typeof window.ym === 'function';

      if (trackerIsReady && routeContentIsReady(elapsedMs)) {
        window.ym(counterId, 'hit', safePageUrl(), {
          title: document.title,
        });
        lastReportedPage = targetPage;
        lastReportedTitle = document.title;
        return;
      }

      if (elapsedMs < trackerTimeoutMs) {
        window.setTimeout(reportWhenReady, pollIntervalMs);
      }
    }

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(reportWhenReady);
    });
  }

  function wrapHistoryMethod(methodName) {
    var original = window.history[methodName];

    if (typeof original !== 'function' || original.__llmeasyMetricaWrapped) {
      return;
    }

    function wrappedHistoryMethod() {
      var previousPage = pageKey();
      var result = original.apply(window.history, arguments);

      if (pageKey() !== previousPage) {
        reportRouteChange();
      }

      return result;
    }

    wrappedHistoryMethod.__llmeasyMetricaWrapped = true;
    window.history[methodName] = wrappedHistoryMethod;
  }

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');
  window.addEventListener('popstate', reportRouteChange);

  function flushTrackerQueues() {
    var clarityIsReady = typeof window.clarity === 'function';
    var metricaIsReady = typeof window.ym === 'function';

    if (clarityIsReady && !claritySurfaceIsSet) {
      window.clarity('set', 'site_surface', 'docs');
      claritySurfaceIsSet = true;
    }

    if (clarityIsReady) {
      while (pendingClarityEvents.length > 0) {
        window.clarity('event', pendingClarityEvents.shift());
      }
    }

    if (metricaIsReady) {
      while (pendingMetricaGoals.length > 0) {
        window.ym(counterId, 'reachGoal', pendingMetricaGoals.shift());
      }
    }

    var needsAnotherPoll = !claritySurfaceIsSet
      || pendingClarityEvents.length > 0
      || pendingMetricaGoals.length > 0;
    var elapsedMs = Date.now() - trackerPollStartedAt;

    if (needsAnotherPoll && elapsedMs < trackerTimeoutMs) {
      trackerPollTimer = window.setTimeout(flushTrackerQueues, pollIntervalMs);
      return;
    }

    trackerPollTimer = null;
  }

  function scheduleTrackerFlush() {
    if (trackerPollTimer !== null) {
      return;
    }

    trackerPollStartedAt = Date.now();
    flushTrackerQueues();
  }

  function reportConversion(eventName) {
    window.gtag('event', eventName, {
      event_category: 'docs',
      site_surface: 'docs',
    });

    pendingClarityEvents.push(eventName);
    pendingMetricaGoals.push(eventName);
    scheduleTrackerFlush();
  }

  function isRegisterLink(anchor) {
    if (!anchor || !anchor.href) {
      return false;
    }

    try {
      var url = new URL(anchor.href, window.location.origin);
      return url.protocol === 'https:'
        && url.hostname === 'bettertoken.ai'
        && normalizePath(url.pathname) === '/register';
    } catch (_error) {
      return false;
    }
  }

  document.addEventListener('click', function (event) {
    var target = event.target;

    if (!target || typeof target.closest !== 'function') {
      return;
    }

    var registerLink = target.closest('a[href]');

    if (isRegisterLink(registerLink)) {
      reportConversion('docs_to_register');
      return;
    }

    if (target.closest('button[data-testid="copy-code-button"]')) {
      reportConversion('docs_code_copied');
    }
  });

  function maskPlayground(element) {
    if (!element || typeof element.matches !== 'function') {
      return;
    }

    if (element.matches('[id^="api-playground-"]')) {
      element.setAttribute('data-clarity-mask', 'true');
    }

    if (typeof element.querySelectorAll === 'function') {
      var playgrounds = element.querySelectorAll('[id^="api-playground-"]');

      for (var index = 0; index < playgrounds.length; index += 1) {
        playgrounds[index].setAttribute('data-clarity-mask', 'true');
      }
    }
  }

  maskPlayground(document.documentElement);

  if (typeof window.MutationObserver === 'function') {
    var playgroundObserver = new window.MutationObserver(function (mutations) {
      for (var mutationIndex = 0; mutationIndex < mutations.length; mutationIndex += 1) {
        var nodes = mutations[mutationIndex].addedNodes;

        for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
          maskPlayground(nodes[nodeIndex]);
        }
      }
    });

    playgroundObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  loadGtmOnce();
  installGtagQueue();
  scheduleTrackerFlush();
})();
