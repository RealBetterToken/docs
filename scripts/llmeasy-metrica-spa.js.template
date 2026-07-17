(function () {
  'use strict';

  if (window.__llmeasyMetricaSpaTrackingInstalled) {
    return;
  }

  window.__llmeasyMetricaSpaTrackingInstalled = true;

  var counterId = 110565477;
  var pollIntervalMs = 50;
  var titleFallbackMs = 1000;
  var trackerTimeoutMs = 15000;
  var navigationVersion = 0;
  var lastReportedPage = pageKey();
  var lastReportedTitle = document.title;

  function pageKey() {
    return window.location.origin + window.location.pathname + window.location.search;
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
        window.ym(counterId, 'hit', window.location.href, {
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
})();
