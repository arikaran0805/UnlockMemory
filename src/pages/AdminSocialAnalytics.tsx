import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Twitter, Facebook, Instagram, Linkedin, Youtube, Github, TrendingUp, Share2, Mail, Copy, MessageCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ClickData {
  platform: string;
  clicks: number;
}

interface ShareData {
  platform: string;
  shares: number;
}

const platformIcons: Record<string, any> = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
};

const shareIcons: Record<string, any> = {
  facebook: Facebook,
  twitter: Twitter,
  whatsapp: MessageCircle,
  email: Mail,
  copy_link: Copy,
};

const COLORS = ['#1DA1F2', '#4267B2', '#E4405F', '#0077B5', '#FF0000', '#333333'];
const SHARE_COLORS = ['#4267B2', '#1DA1F2', '#25D366', '#EA4335', '#6B7280'];

const AdminSocialAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [clickData, setClickData] = useState<ClickData[]>([]);
  const [shareData, setShareData] = useState<ShareData[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalShares, setTotalShares] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check for admin or moderator role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "moderator"]);

    if (!roleData || roleData.length === 0) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    await Promise.all([loadAnalytics(), loadShareAnalytics()]);
    setLoading(false);
  };

  const loadAnalytics = async () => {
    const { data, error } = await supabase
      .from("social_media_clicks")
      .select("platform");

    if (error) {
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const platformCounts: Record<string, number> = {};
    data.forEach((click) => {
      platformCounts[click.platform] = (platformCounts[click.platform] || 0) + 1;
    });

    const chartData = Object.entries(platformCounts).map(([platform, clicks]) => ({
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      clicks,
    }));

    setClickData(chartData);
    setTotalClicks(data.length);
  };

  const loadShareAnalytics = async () => {
    const { data, error } = await supabase
      .from("post_shares")
      .select("platform");

    if (error) {
      console.error("Error loading share analytics:", error);
      return;
    }

    const platformCounts: Record<string, number> = {};
    data.forEach((share) => {
      platformCounts[share.platform] = (platformCounts[share.platform] || 0) + 1;
    });

    const chartData = Object.entries(platformCounts).map(([platform, shares]) => ({
      platform: platform === "copy_link" ? "Copy Link" : platform.charAt(0).toUpperCase() + platform.slice(1),
      shares,
    }));

    setShareData(chartData);
    setTotalShares(data.length);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Social Media Analytics</h1>
            <p className="text-muted-foreground">
              Track engagement across your social media platforms and post shares
            </p>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">
          <Tabs defaultValue="shares" className="space-y-6">
          <TabsList>
            <TabsTrigger value="shares" className="gap-2">
              <Share2 className="h-4 w-4" />
              Post Shares
            </TabsTrigger>
            <TabsTrigger value="clicks" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Social Link Clicks
            </TabsTrigger>
          </TabsList>

          {/* Post Shares Tab */}
          <TabsContent value="shares" className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  Total Post Shares
                </CardTitle>
                <CardDescription>All-time post shares across platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">{totalShares}</p>
              </CardContent>
            </Card>

            {/* Platform Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {shareData.map((data, index) => {
                const platformKey = data.platform.toLowerCase().replace(" ", "_");
                const Icon = shareIcons[platformKey] || Share2;
                return (
                  <Card key={data.platform}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5" style={{ color: SHARE_COLORS[index % SHARE_COLORS.length] }} />
                        {data.platform}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold" style={{ color: SHARE_COLORS[index % SHARE_COLORS.length] }}>
                        {data.shares}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {totalShares > 0 ? ((data.shares / totalShares) * 100).toFixed(1) : 0}% of total
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts */}
            {shareData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Shares by Platform</CardTitle>
                    <CardDescription>Compare post shares across platforms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={shareData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="platform" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="shares" fill="#8884d8">
                          {shareData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SHARE_COLORS[index % SHARE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Share Distribution</CardTitle>
                    <CardDescription>Platform share of total shares</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={shareData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ platform, percent }) => `${platform} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="shares"
                        >
                          {shareData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SHARE_COLORS[index % SHARE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {shareData.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No post shares tracked yet. Users can share posts to start collecting data!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Social Link Clicks Tab */}
          <TabsContent value="clicks" className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Total Social Link Clicks
                </CardTitle>
                <CardDescription>All-time social media link clicks</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">{totalClicks}</p>
              </CardContent>
            </Card>

            {/* Platform Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clickData.map((data, index) => {
                const Icon = platformIcons[data.platform.toLowerCase()] || TrendingUp;
                return (
                  <Card key={data.platform}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5" style={{ color: COLORS[index % COLORS.length] }} />
                        {data.platform}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                        {data.clicks}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {totalClicks > 0 ? ((data.clicks / totalClicks) * 100).toFixed(1) : 0}% of total
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts */}
            {clickData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Clicks by Platform</CardTitle>
                    <CardDescription>Compare engagement across platforms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={clickData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="platform" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="clicks" fill="#8884d8">
                          {clickData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Distribution</CardTitle>
                    <CardDescription>Platform share of total clicks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={clickData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ platform, percent }) => `${platform} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="clicks"
                        >
                          {clickData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {clickData.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No social media clicks tracked yet. Share your links to start collecting data!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </>
);
};

export default AdminSocialAnalytics;
