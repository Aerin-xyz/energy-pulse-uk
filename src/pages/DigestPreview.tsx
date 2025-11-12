import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NavigationBar } from '@/components/NavigationBar';

interface Newsletter {
  id: string;
  week: string;
  status: string;
  subject: string;
  html_content: string;
  text_content: string;
}

interface RankedItem {
  id: string;
  score: number;
  is_included: boolean;
  raw_items: {
    title: string;
    url: string;
    source: string;
    type: string;
  };
  summaries: Array<{ summary_text: string }>;
}

interface SocialPost {
  id: string;
  post_type: string;
  content: string;
  status: string;
}

interface Snapshot {
  week: string;
  avg_wind: number;
  avg_gas: number;
  avg_solar: number;
  avg_ci: number;
  biggest_swing: string;
}

export default function DigestPreview() {
  const [searchParams] = useSearchParams();
  const week = searchParams.get('week') || getCurrentISOWeek();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [headlines, setHeadlines] = useState<RankedItem[]>([]);
  const [papers, setPapers] = useState<RankedItem[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);

  useEffect(() => {
    loadDigest();
  }, [week]);

  async function loadDigest() {
    setLoading(true);
    try {
      // Load newsletter
      const { data: newsData } = await supabase
        .from('newsletter_issues')
        .select('*')
        .eq('week', week)
        .single();

      if (newsData) setNewsletter(newsData);

      // Load snapshot
      const { data: snapData } = await supabase
        .from('snapshot_metrics')
        .select('*')
        .eq('week', week)
        .single();

      if (snapData) setSnapshot(snapData);

      // Load ranked items
      const { data: rankedData } = await supabase
        .from('ranked_items')
        .select(`
          *,
          raw_items:raw_item_id (*),
          summaries (*)
        `)
        .eq('week', week)
        .order('score', { ascending: false });

      const headlineItems = rankedData?.filter(item => item.raw_items.type === 'headline') || [];
      const paperItems = rankedData?.filter(item => item.raw_items.type === 'paper') || [];
      
      setHeadlines(headlineItems);
      setPapers(paperItems);

      // Load social posts
      if (newsData) {
        const { data: postsData } = await supabase
          .from('social_posts')
          .select('*')
          .eq('newsletter_id', newsData.id);

        if (postsData) setSocialPosts(postsData);
      }
    } catch (error) {
      console.error('Error loading digest:', error);
      toast({
        title: 'Error',
        description: 'Failed to load digest preview',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function toggleItemInclusion(itemId: string, currentState: boolean) {
    const { error } = await supabase
      .from('ranked_items')
      .update({ is_included: !currentState })
      .eq('id', itemId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive',
      });
    } else {
      loadDigest();
    }
  }

  async function updatePostContent(postId: string, content: string) {
    const { error } = await supabase
      .from('social_posts')
      .update({ content })
      .eq('id', postId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update post',
        variant: 'destructive',
      });
    }
  }

  async function approveNewsletter() {
    if (!newsletter) return;

    const { error } = await supabase
      .from('newsletter_issues')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', newsletter.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve newsletter',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Approved',
        description: 'Newsletter approved and ready to publish',
      });
      loadDigest();
    }
  }

  async function publishNow() {
    if (!newsletter || newsletter.status !== 'approved') {
      toast({
        title: 'Error',
        description: 'Newsletter must be approved first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('publisher-agent', {
        body: { issue_id: newsletter.id },
      });

      if (error) throw error;

      toast({
        title: 'Published',
        description: `Sent ${data.social_posts_sent} social posts and email newsletter`,
      });
      loadDigest();
    } catch (error: any) {
      toast({
        title: 'Publish Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container mx-auto py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Energy Mix Weekly Digest</h1>
            <p className="text-muted-foreground">Week {week}</p>
          </div>
          <div className="flex gap-2">
            {newsletter?.status === 'draft' && (
              <Button onClick={approveNewsletter}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            )}
            {newsletter?.status === 'approved' && (
              <Button onClick={publishNow}>
                Publish Now
              </Button>
            )}
            {newsletter?.status === 'sent' && (
              <div className="flex items-center text-green-600">
                <CheckCircle className="mr-2 h-4 w-4" />
                Sent
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="snapshot">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
            <TabsTrigger value="headlines">Headlines ({headlines.length})</TabsTrigger>
            <TabsTrigger value="papers">Papers ({papers.length})</TabsTrigger>
            <TabsTrigger value="social">Social Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="snapshot" className="space-y-4 mt-4">
            {snapshot ? (
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-accent rounded-lg">
                    <p className="font-semibold">{snapshot.biggest_swing}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Wind</p>
                      <p className="text-2xl font-bold">{(snapshot.avg_wind / 1000).toFixed(1)} GW</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gas</p>
                      <p className="text-2xl font-bold">{(snapshot.avg_gas / 1000).toFixed(1)} GW</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Solar</p>
                      <p className="text-2xl font-bold">{(snapshot.avg_solar / 1000).toFixed(1)} GW</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Carbon Intensity</p>
                      <p className="text-2xl font-bold">{snapshot.avg_ci.toFixed(0)} gCO₂/kWh</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <XCircle className="h-12 w-12 mx-auto mb-4" />
                  <p>No snapshot data available. Run snapshot-agent.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="headlines" className="space-y-4 mt-4">
            {headlines.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Switch
                      checked={item.is_included}
                      onCheckedChange={() => toggleItemInclusion(item.id, item.is_included)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-accent px-2 py-1 rounded">Score: {item.score.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">{item.raw_items.source}</span>
                      </div>
                      <a href={item.raw_items.url} target="_blank" rel="noopener noreferrer" 
                         className="text-lg font-semibold hover:underline mb-2 block">
                        {item.raw_items.title}
                      </a>
                      <p className="text-sm text-muted-foreground">
                        {item.summaries[0]?.summary_text || 'No summary'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="papers" className="space-y-4 mt-4">
            {papers.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Switch
                      checked={item.is_included}
                      onCheckedChange={() => toggleItemInclusion(item.id, item.is_included)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-accent px-2 py-1 rounded">Score: {item.score.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">{item.raw_items.source}</span>
                      </div>
                      <a href={item.raw_items.url} target="_blank" rel="noopener noreferrer"
                         className="text-lg font-semibold hover:underline">
                        {item.raw_items.title}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="social" className="space-y-4 mt-4">
            {socialPosts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <CardTitle className="capitalize">{post.post_type} Post</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={post.content}
                    onChange={(e) => updatePostContent(post.id, e.target.value)}
                    rows={6}
                    className="mb-2"
                  />
                  <div className="text-xs text-muted-foreground">
                    Status: <span className="font-semibold">{post.status}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function getCurrentISOWeek(): string {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
}
