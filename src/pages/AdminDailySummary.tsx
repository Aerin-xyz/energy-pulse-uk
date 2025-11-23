import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NavigationBar } from '@/components/NavigationBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface DailySummaryPost {
  id: string;
  summary_date: string | null;
  image_path: string | null;
  status: string;
  content: string;
  created_at: string;
  sent_at: string | null;
}

const AdminDailySummary = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<DailySummaryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('post_type', 'daily_summary')
        .order('summary_date', { ascending: false })
        .limit(7);

      if (error) throw error;

      setPosts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const generateCardForYesterday = async () => {
    try {
      setGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-daily-summary-card', {
        body: {}, // Will default to yesterday
      });

      if (error) {
        throw new Error(data?.error || error.message);
      }

      toast({
        title: 'Success',
        description: `Card generated for ${data.date}`,
      });

      fetchPosts();
    } catch (error: any) {
      toast({
        title: 'Error generating card',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'approved':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-border';
    }
  };

  return (
    <>
      <Helmet>
        <title>Daily Summary Cards - Admin | Energy Mix</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <NavigationBar />
      
      <div className="min-h-screen bg-background pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Daily Summary Cards
              </h1>
              <p className="text-muted-foreground">
                Manage daily UK energy mix summary cards for social media
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={fetchPosts}
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button
                onClick={generateCardForYesterday}
                disabled={generating}
                className="bg-primary hover:bg-primary/90"
              >
                <ImageIcon className={`h-4 w-4 mr-2 ${generating ? 'animate-pulse' : ''}`} />
                Generate Card for Yesterday
              </Button>
            </div>
          </div>

          {loading && posts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  Loading posts...
                </div>
              </CardContent>
            </Card>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    No daily summary cards yet
                  </p>
                  <Button onClick={generateCardForYesterday} disabled={generating}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Generate Your First Card
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {posts.map((post) => (
                <Card key={post.id} className="border-border/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-2">
                          {post.summary_date
                            ? new Date(post.summary_date + 'T12:00:00Z').toLocaleDateString('en-GB', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            : 'No date'}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Created {new Date(post.created_at).toLocaleDateString()}</span>
                          {post.sent_at && (
                            <>
                              <span>•</span>
                              <span>Sent {new Date(post.sent_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge className={getStatusColor(post.status)}>
                        {post.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Image preview */}
                      <div>
                        {post.image_path ? (
                          <div className="relative group">
                            <img
                              src={post.image_path}
                              alt={`Daily summary for ${post.summary_date}`}
                              className="w-full rounded-lg border border-border/50 shadow-lg"
                            />
                            <a
                              href={post.image_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 right-2 p-2 bg-background/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ) : (
                          <div className="w-full aspect-[1200/630] rounded-lg border border-border/50 flex items-center justify-center bg-muted/20">
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Post details */}
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Post Content
                          </div>
                          <div className="text-sm text-foreground bg-muted/20 rounded-lg p-3 min-h-[100px]">
                            {post.content || <span className="text-muted-foreground italic">No content yet</span>}
                          </div>
                        </div>

                        {post.image_path && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground mb-2">
                              Image URL
                            </div>
                            <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 font-mono break-all">
                              {post.image_path}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminDailySummary;
