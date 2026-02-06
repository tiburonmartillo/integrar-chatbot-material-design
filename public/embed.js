(function () {
  'use strict';

  var script = document.currentScript;
  var baseUrl = (script && script.getAttribute('data-chatbot-url')) || window.location.origin;
  baseUrl = baseUrl.replace(/\/$/, '');
  var embedUrl = baseUrl + '/embed.html';

  var container = document.createElement('div');
  container.id = 'chatbot-embed-container';
  container.style.cssText =
    'position:fixed;bottom:24px;right:24px;z-index:999999;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:12px;';

  var iframe = document.createElement('iframe');
  iframe.setAttribute('data-chatbot-iframe', 'true');
  iframe.src = embedUrl;
  iframe.style.cssText =
    'width:400px;height:560px;max-width:calc(100vw - 48px);max-height:calc(100vh - 120px);border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);display:none;';
  iframe.title = 'Chatbot';

  var button = document.createElement('button');
  button.setAttribute('aria-label', 'Abrir chat');
  button.style.cssText =
    'width:56px;height:56px;flex-shrink:0;border-radius:16px;border:none;background:#D6E3FF;color:#284777;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;transition:transform 0.2s;';
  button.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  button.addEventListener('mouseenter', function () {
    button.style.transform = 'scale(1.05)';
  });
  button.addEventListener('mouseleave', function () {
    button.style.transform = 'scale(1)';
  });

  var isOpen = false;
  function setOpen(open) {
    isOpen = open;
    iframe.style.display = isOpen ? 'block' : 'none';
    if (isOpen && iframe.contentWindow) {
      setTimeout(function () {
        iframe.contentWindow.postMessage({ type: 'CHATBOT_FOCUS_INPUT' }, '*');
      }, 300);
    }
    // Ocultar completamente el botón cuando el chat está abierto
    button.style.display = isOpen ? 'none' : 'flex';
    button.style.visibility = isOpen ? 'hidden' : 'visible';
    button.style.pointerEvents = isOpen ? 'none' : 'auto';
    button.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    button.setAttribute('aria-label', isOpen ? 'Cerrar chat' : 'Abrir chat');
  }
  button.addEventListener('click', function () {
    setOpen(!isOpen);
  });

  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);

  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'CHATBOT_CLOSE') {
      setOpen(false);
      return;
    }
    if (event.data && event.data.type === 'CHATBOT_READY' && iframe.contentWindow) {
      var initData = {
        type: 'INIT',
        pageContent: document.body ? document.body.innerText || '' : '',
      };
      var apiBaseUrl = script && script.getAttribute('data-api-base-url');
      var apiEndpoints = script && script.getAttribute('data-api-endpoints');
      if (apiBaseUrl) {
        initData.apiConfig = {
          baseUrl: apiBaseUrl,
          endpoints: apiEndpoints ? apiEndpoints.split(',').map(function (e) { return e.trim(); }) : ['/'],
          token: script && script.getAttribute('data-api-token') || undefined,
        };
      }
      iframe.contentWindow.postMessage(initData, '*');
    }
  });
})();
