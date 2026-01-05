// Simple navbar component: injects links and handles relative paths
(function(){
  function buildLinks() {
    const path = window.location.pathname || '';
    const inHtmlDir = path.indexOf('/html/') !== -1 || path.endsWith('/html');
    const home = inHtmlDir ? '../index.html' : 'index.html';
    const top = inHtmlDir ? 'top_mc.html' : 'html/top_mc.html';
    return { home, top };
  }

  function render() {
    const root = document.getElementById('navbar-root');
    if (!root) return;
    const links = buildLinks();
    const nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.innerHTML = `
      <a class="nav-logo" href="${links.home}">OAF</a>
      <div class="nav-links">
        <a href="${links.home}" data-nav>Accueil</a>
        <a href="${links.top}" data-nav>Top Market Cap</a>
      </div>
    `;
    root.appendChild(nav);
    // highlight active link
    const anchors = nav.querySelectorAll('a[data-nav]');
    anchors.forEach(a=>{
      try {
        const url = new URL(a.href, window.location.href);
        if (url.pathname === window.location.pathname) a.classList.add('active');
      } catch(e){}
    });
  }

  document.addEventListener('DOMContentLoaded', render);
})();
