import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// News source configurations
const RSS_SOURCES = [
  { name: "Carbon Brief", url: "https://www.carbonbrief.org/feed/", type: "headline" },
  { name: "Current±", url: "https://www.current-news.co.uk/feed/", type: "headline" },
  { name: "Ofgem", url: "https://www.ofgem.gov.uk/news-and-updates/rss.xml", type: "headline" },
  { name: "DESNZ", url: "https://www.gov.uk/government/organisations/department-for-energy-security-and-net-zero.atom", type: "headline" },
  { name: "National Grid ESO", url: "https://www.nationalgrideso.com/news?format=rss", type: "headline" },
  { name: "IEA", url: "https://www.iea.org/rss/news.xml", type: "headline" },
  { name: "Ember Climate", url: "https://ember-climate.org/feed/", type: "headline" },
  { name: "Carbon Tracker", url: "https://carbontracker.org/feed/", type: "headline" },
  { name: "Chatham House", url: "https://www.chathamhouse.org/rss", type: "headline" },
  { name: "Prof Dieter Helm", url: "https://www.dieterhelm.co.uk/feed/", type: "headline" },
  { name: "Dr Jan Rosenow", url: "https://janrosenow.substack.com/feed", type: "headline" },
  { name: "ECIU", url: "https://eciu.net/rss", type: "headline" },
  { name: "Regen", url: "https://www.regen.co.uk/feed/", type: "headline" },
  { name: "RAP Europe", url: "https://www.raponline.org/feed/", type: "headline" },
  { name: "Grantham Institute", url: "https://www.imperial.ac.uk/grantham/rss/news.xml", type: "headline" },
  { name: "Energy Systems Catapult", url: "https://esc.catapult.org.uk/feed/", type: "headline" },
];

interface RawItem {
  source: string;
  title: string;
  summary: string | null;
  url: string;
  type: string;
  published_at: string;
  raw_data: any;
  content_hash: string;
}

async function parseRSSFeed(url: string, sourceName: string): Promise<Partial<RawItem>[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch ${sourceName}: ${response.status}`);
      return [];
    }

    const text = await response.text();
    const items: Partial<RawItem>[] = [];
    
    // Basic XML parsing for RSS/Atom
    const itemMatches = text.match(/<(item|entry)>[\s\S]*?<\/(item|entry)>/g) || [];
    
    for (const itemXml of itemMatches) {
      const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim() || '';
      const link = itemXml.match(/<link[^>]*>(.*?)<\/link>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim() || 
                   itemXml.match(/<link[^>]*href="([^"]+)"/)?.[1] || '';
      const description = itemXml.match(/<(description|summary)>(.*?)<\/(description|summary)>/)?.[2]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim() || null;
      const pubDate = itemXml.match(/<(pubDate|published|updated)>(.*?)<\/(pubDate|published|updated)>/)?.[2]?.trim() || new Date().toISOString();
      
      if (title && link) {
        items.push({
          source: sourceName,
          title: decodeHTMLEntities(title),
          summary: description ? decodeHTMLEntities(description.replace(/<[^>]+>/g, '').substring(0, 500)) : null,
          url: link,
          published_at: new Date(pubDate).toISOString(),
        });
      }
    }

    return items;
  } catch (error) {
    console.error(`Error parsing RSS for ${sourceName}:`, error);
    return [];
  }
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchCrossrefPapers(): Promise<Partial<RawItem>[]> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const query = encodeURIComponent('UK electricity OR UK energy OR UK grid OR UK power');
    const url = `https://api.crossref.org/works?query=${query}&filter=from-pub-date:${sevenDaysAgo}&rows=20&sort=published&order=desc`;
    
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    const items: Partial<RawItem>[] = [];
    
    for (const work of data.message?.items || []) {
      if (work.title && work.URL) {
        items.push({
          source: "Crossref",
          title: Array.isArray(work.title) ? work.title[0] : work.title,
          summary: work.abstract ? work.abstract.substring(0, 500) : null,
          url: work.URL,
          type: "paper",
          published_at: work.published?.['date-time'] || work.created?.['date-time'] || new Date().toISOString(),
        });
      }
    }
    
    return items;
  } catch (error) {
    console.error('Error fetching Crossref papers:', error);
    return [];
  }
}

async function generateContentHash(title: string, url: string): Promise<string> {
  const data = new TextEncoder().encode(title + url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting collection from RSS sources...');
    
    // Collect from all RSS sources
    const rssPromises = RSS_SOURCES.map(source => 
      parseRSSFeed(source.url, source.name).then(items => 
        items.map(item => ({ ...item, type: source.type }))
      )
    );
    
    const rssResults = await Promise.all(rssPromises);
    const allRssItems = rssResults.flat();
    
    console.log(`Collected ${allRssItems.length} RSS items`);

    // Collect from Crossref
    const paperItems = await fetchCrossrefPapers();
    console.log(`Collected ${paperItems.length} papers from Crossref`);

    // Combine all items
    const allItems = [...allRssItems, ...paperItems];
    
    // Generate content hashes and prepare for insertion
    const itemsWithHashes: RawItem[] = await Promise.all(
      allItems.map(async (item) => ({
        source: item.source!,
        title: item.title!,
        summary: item.summary || null,
        url: item.url!,
        type: item.type!,
        published_at: item.published_at!,
        raw_data: item,
        content_hash: await generateContentHash(item.title!, item.url!),
      }))
    );

    // Insert items (ignore duplicates)
    let insertedCount = 0;
    for (const item of itemsWithHashes) {
      const { error } = await supabase
        .from('raw_items')
        .insert(item)
        .select();
      
      if (!error) {
        insertedCount++;
      } else if (!error.message.includes('unique')) {
        console.error('Insert error:', error);
      }
    }

    console.log(`Successfully inserted ${insertedCount} new items`);

    return new Response(
      JSON.stringify({
        success: true,
        collected: allItems.length,
        inserted: insertedCount,
        duplicates: allItems.length - insertedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Collection error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
