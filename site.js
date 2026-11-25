{
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  const burger = document.getElementById("burger"), menu = document.getElementById("menu");
  if (burger && menu) {
    burger.onclick = () => { const o = menu.classList.toggle("open"); burger.setAttribute("aria-expanded", o); };
    menu.addEventListener("click", e => { if (e.target.tagName === "A") { menu.classList.remove("open"); burger.setAttribute("aria-expanded", false); } });
  }

  // header turns solid after scrolling past the hero
  const top = document.getElementById("top");
  const onScroll = () => top && top.classList.toggle("solid", window.scrollY > 40);
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

  // reveal on scroll (staggered within each group)
  const els = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("anim");
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const sibs = [...e.target.parentElement.children].filter(x => x.classList.contains("rv"));
      e.target.style.transitionDelay = Math.min(sibs.indexOf(e.target), 4) * 90 + "ms";
      e.target.classList.add("in"); io.unobserve(e.target);
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(el => io.observe(el));
  }

  // license lightbox (licenses page)
  const lb = document.getElementById("lb");
  if (lb) {
    const img = document.getElementById("lbimg"), x = document.getElementById("lbx"); let last;
    document.querySelectorAll("[data-src]").forEach(b => b.onclick = () => { last = b; img.src = b.dataset.src; img.alt = b.querySelector("img").alt; lb.hidden = false; x.focus(); });
    const close = () => { lb.hidden = true; last && last.focus(); };
    x.onclick = close; lb.onclick = e => { if (e.target === lb) close(); };
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !lb.hidden) close(); });
  }
}
