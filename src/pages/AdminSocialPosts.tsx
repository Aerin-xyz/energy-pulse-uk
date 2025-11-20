import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavigationBar } from "@/components/NavigationBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Edit, Send, Clock, AlertCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface SocialPost {
  id: string;
  week: string | null;
  platform: string;
  post_type: string;
  content: string;
  image_path: string | null;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  linkedin_post_id: string | null;
  error_message: string | null;
  created_at: string;
}

const getCurrentWeek = () => {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil(((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

const AdminSocialPosts = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [selectedChannel, setSelectedChannel] = useState("linkedin");
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editScheduledFor, setEditScheduledFor] = useState("");
  const [configError, setConfigError] = useState(false);
  const [transport, setTransport] = useState<'api' | 'webhook' | null>(null);

  useEffect(() => {
    checkConfig();
    fetchPosts();
  }, [selectedWeek, selectedChannel]);

  const checkConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-linkedin-config');
      if (error) throw error;
      setConfigError(!data.configured);
      setTransport(data.transport || null);
    } catch (error) {
      console.error('Error checking config:', error);
      setConfigError(true);
      setTransport(null);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('social_posts')
        .select('*')
        .eq('platform', selectedChannel)
        .order('created_at', { ascending: false });

      if (selectedWeek) {
        query = query.eq('week', selectedWeek);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch social posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (post: SocialPost) => {
    setEditingPost(post);
    setEditContent(post.content);
    setEditScheduledFor(post.scheduled_for || "");
  };

  const saveEdit = async () => {
    if (!editingPost) return;

    try {
      const { error } = await supabase
        .from('social_posts')
        .update({
          content: editContent,
          scheduled_for: editScheduledFor || null,
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post updated successfully",
      });
      setEditingPost(null);
      fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive",
      });
    }
  };

  const approveAndSendNow = async (postId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-social-post', {
        body: { postId, mode: 'now' }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Post sent successfully",
      });
      fetchPosts();
    } catch (error: any) {
      console.error('Error sending post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send post",
        variant: "destructive",
      });
    }
  };

  const approveAndSchedule = async (postId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-social-post', {
        body: { postId, mode: 'schedule' }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Post scheduled successfully",
      });
      fetchPosts();
    } catch (error: any) {
      console.error('Error scheduling post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule post",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'approved': return 'default';
      case 'sent': return 'default';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'approved': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'failed': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default: return '';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Helmet>
        <title>LinkedIn Post Approval - Energy Mix Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <NavigationBar />

        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">LinkedIn Post Approval</h1>
              <p className="text-muted-foreground">Review and approve social media posts</p>
            </div>
            <Button onClick={fetchPosts} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {configError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                LinkedIn automation not configured. Add MAKE_API_TOKEN + MAKE_API_BASE_URL + MAKE_SCENARIO_ID_LINKEDIN_PUBLISHER or MAKE_LINKEDIN_WEBHOOK_URL.
              </p>
            </div>
          )}

          {!configError && transport && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10">
                Transport: {transport === 'api' ? 'Make API' : 'Webhook'}
              </Badge>
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label>Week</Label>
              <Input
                type="text"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                placeholder="2025-W46"
              />
            </div>
            <div className="flex-1">
              <Label>Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No posts found for the selected filters
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{post.post_type}</CardTitle>
                      <Badge variant={getStatusColor(post.status)} className={getStatusStyle(post.status)}>
                        {post.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {post.image_path && (
                      <div className="w-full h-40 bg-muted rounded overflow-hidden">
                        <img 
                          src={post.image_path} 
                          alt="Post preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      </div>
                    )}

                    <div className="max-h-32 overflow-y-auto text-sm text-muted-foreground">
                      {post.content}
                    </div>

                    {post.scheduled_for && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Scheduled: {formatDate(post.scheduled_for)}
                      </div>
                    )}

                    {post.status === 'sent' && (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Sent at {formatDate(post.sent_at)}
                        {post.linkedin_post_id && (
                          <div className="mt-1">ID: {post.linkedin_post_id}</div>
                        )}
                      </div>
                    )}

                    {post.status === 'failed' && post.error_message && (
                      <div className="text-xs text-destructive">
                        Failed: {post.error_message}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(post)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      
                      {post.status !== 'sent' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveAndSendNow(post.id)}
                            disabled={configError}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Send Now
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => approveAndSchedule(post.id)}
                            disabled={configError}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Schedule
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Content</Label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label>Scheduled Time (optional)</Label>
                <Input
                  type="datetime-local"
                  value={editScheduledFor ? new Date(editScheduledFor).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditScheduledFor(e.target.value ? new Date(e.target.value).toISOString() : '')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPost(null)}>
                Cancel
              </Button>
              <Button onClick={saveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default AdminSocialPosts;
