

## Plan: Update Sitemap.xml for Google Search Console

### Step 1: Update public/sitemap.xml

Update the sitemap with current dates and add any missing public pages:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://energymix.info/</loc>
    <lastmod>2026-01-24</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://energymix.info/about</loc>
    <lastmod>2026-01-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://energymix.info/data</loc>
    <lastmod>2026-01-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://energymix.info/insights</loc>
    <lastmod>2026-01-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://energymix.info/newsletter</loc>
    <lastmod>2026-01-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://energymix.info/share/daily-summary</loc>
    <lastmod>2026-01-24</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

### Step 2: Update public/robots.txt

The current robots.txt is good but could be simplified and enhanced with explicit Disallow rules for admin pages:

```txt
User-agent: *
Allow: /

# Block admin pages from indexing
Disallow: /admin/

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

Sitemap: https://energymix.info/sitemap.xml
```

### Step 3: Verify in Google Search Console

After publishing:
1. Go to Google Search Console
2. Navigate to "Sitemaps" in the left sidebar
3. Submit `https://energymix.info/sitemap.xml`
4. Google will validate and begin crawling the listed URLs

### Notes

- The `/share/daily-summary` page is included as it's a public shareable page (not an admin page)
- Admin routes (`/admin/*`) are excluded from the sitemap and blocked in robots.txt
- The sitemap uses the production domain `energymix.info`
- All `lastmod` dates updated to current date

