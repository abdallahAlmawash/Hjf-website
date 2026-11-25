"""Copy partials/header.html and partials/footer.html into every page so the footer is identical site-wide.
Run from the repo root after editing the footer or adding a page:  python3 tools/sync_footer.py"""
import glob, re
foot = open("partials/footer.html", encoding="utf-8").read().strip()
head = open("partials/header.html", encoding="utf-8").read().strip()
for f in glob.glob("*.html"):
    t = open(f, encoding="utf-8").read()
    t = re.sub(r"(<!-- SHARED FOOTER[^\n]*\n)?<footer>.*?</footer>", lambda m: foot, t, flags=re.S)
    t = re.sub(r"(<!-- SHARED HEADER[^\n]*\n)?<header class=\"top[^\"]*\" id=\"top\">.*?</header>|<header class=\"top\">.*?</header>", lambda m: head, t, count=1, flags=re.S)
    if 'src="site.js' not in t:
        t = t.replace("</body>", '<script src="site.js?v=7"></script>\n</body>')
    t = re.sub(r'href="style\.css(\?v=\d+)?"', 'href="style.css?v=7"', t)
    t = re.sub(r'src="site\.js(\?v=\d+)?"', 'src="site.js?v=7"', t)
    open(f, "w", encoding="utf-8").write(t)
    print("synced", f)
