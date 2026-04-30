import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, Users, FileText, Star, BarChart3, ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";
import { adminApi, type User, type Problem, type Rating } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getUsers(),
      adminApi.getProblems(),
      adminApi.getRatings(),
    ]).then(([s, u, p, r]) => {
      setStats(s.stats);
      setUsers(u.users);
      setProblems(p.problems);
      setRatings(r.ratings);
    }).catch(err => {
      if (err.message.includes("Admin")) navigate("/");
    }).finally(() => setLoading(false));
  }, []);

  const deleteUser = async (id: string) => {
    try {
      await adminApi.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast({ title: "User deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteProblem = async (id: string) => {
    try {
      await adminApi.deleteProblem(id);
      setProblems(prev => prev.filter(p => p._id !== id));
      toast({ title: "Problem deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex justify-center items-center py-32">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">Platform overview and management</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Users", value: stats.totalUsers, icon: Users },
              { label: "Startups", value: stats.startups, icon: BarChart3 },
              { label: "Freelancers", value: stats.freelancers, icon: Users },
              { label: "Problems Posted", value: stats.totalProblems, icon: FileText },
              { label: "Open Problems", value: stats.openProblems, icon: FileText },
              { label: "Applications", value: stats.totalApplications, icon: FileText },
              { label: "Active Collabs", value: stats.acceptedApplications, icon: Users },
              { label: "Ratings Given", value: stats.ratings, icon: Star },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className="h-8 w-8 text-primary/60" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="problems">Problems ({problems.length})</TabsTrigger>
            <TabsTrigger value="ratings">Ratings ({ratings.length})</TabsTrigger>
          </TabsList>

          {/* Users tab */}
          <TabsContent value="users">
            <div className="space-y-2">
              {users.map(u => (
                <Card key={u.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      {u.avatar ? (
                        <img src={u.avatar} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {u.fullName?.[0] || "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground text-sm">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {u.role && <Badge variant="secondary" className="capitalize">{u.role}</Badge>}
                      {u.onboarded && <Badge className="bg-green-100 text-green-700 text-xs">Onboarded</Badge>}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteUser(u.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Problems tab */}
          <TabsContent value="problems">
            <div className="space-y-2">
              {problems.map(p => (
                <Card key={p._id}>
                  <CardContent className="flex items-start justify-between p-4">
                    <div>
                      <p className="font-medium text-foreground text-sm">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.description}</p>
                      <div className="flex gap-2 mt-2">
                        {p.tags.slice(0, 3).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                        <Badge className={p.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                      onClick={() => deleteProblem(p._id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Ratings tab */}
          <TabsContent value="ratings">
            <div className="space-y-2">
              {ratings.map(r => {
                const reviewer = typeof r.reviewerId === "object" ? r.reviewerId : null;
                const reviewee = typeof r.revieweeId === "object" ? r.revieweeId : null;
                return (
                  <Card key={r._id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">{reviewer?.fullName || "?"}</span>
                        <span className="text-muted-foreground">rated</span>
                        <span className="font-medium text-foreground">{reviewee?.fullName || "?"}</span>
                        <div className="flex ml-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={14} className={i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-xs text-muted-foreground mt-1 italic">"{r.comment}"</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;
