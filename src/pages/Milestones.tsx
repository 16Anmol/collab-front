import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Clock, Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { milestonesApi, applicationsApi, type Milestone, type Application } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const statusColor = (s: string) => {
  if (s === "completed") return "bg-green-100 text-green-700";
  if (s === "in_progress") return "bg-blue-100 text-blue-700";
  return "bg-yellow-100 text-yellow-700";
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "completed") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === "in_progress") return <Clock className="h-5 w-5 text-blue-500" />;
  return <Circle className="h-5 w-5 text-yellow-500" />;
};

const Milestones = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [acceptedApps, setAcceptedApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ applicationId: "", title: "", description: "", dueDate: "" });

  useEffect(() => {
    milestonesApi.getMine()
      .then(({ milestones }) => setMilestones(milestones))
      .finally(() => setLoading(false));

    // Startups can add milestones to accepted applications
    if (user?.role === "startup") {
      applicationsApi.getReceived()
        .then(({ applications }) => setAcceptedApps(applications.filter(a => ["accepted","selected","finalised","pending"].includes(a.status))));
    }
  }, [user]);

  const handleAdd = async () => {
    if (!form.applicationId || !form.title.trim()) {
      toast({ title: "Application and title are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const m = await milestonesApi.create({
        applicationId: form.applicationId,
        title: form.title.trim(),
        description: form.description,
        dueDate: form.dueDate || undefined,
      });
      setMilestones(prev => [...prev, m]);
      setShowAdd(false);
      setForm({ applicationId: "", title: "", description: "", dueDate: "" });
      toast({ title: "Milestone added!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id: string, status: "pending" | "in_progress" | "completed") => {
    try {
      const updated = await milestonesApi.updateStatus(id, status);
      setMilestones(prev => prev.map(m => m._id === id ? updated : m));
      toast({ title: `Milestone marked as ${status.replace("_", " ")}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await milestonesApi.delete(id);
      setMilestones(prev => prev.filter(m => m._id !== id));
      toast({ title: "Milestone deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const pending = milestones.filter(m => m.status === "pending");
  const inProgress = milestones.filter(m => m.status === "in_progress");
  const completed = milestones.filter(m => m.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={18} /></Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Milestones</h1>
              <p className="text-muted-foreground mt-1">Track project progress across your collaborations</p>
            </div>
          </div>
          {user?.role === "startup" && (
            <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Milestone</Button>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Pending", count: pending.length, color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
            { label: "In Progress", count: inProgress.length, color: "bg-blue-50 border-blue-200 text-blue-700" },
            { label: "Completed", count: completed.length, color: "bg-green-50 border-green-200 text-green-700" },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-4 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
        ) : milestones.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">No milestones yet.</p>
            {user?.role === "startup" && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}><Plus size={16} /> Add First Milestone</Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map(m => (
              <Card key={m._id} className={m.status === "completed" ? "opacity-75" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <StatusIcon status={m.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`font-semibold text-foreground ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                            {m.title}
                          </h3>
                          {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                          {m.dueDate && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Due: {new Date(m.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={statusColor(m.status)}>{m.status.replace("_", " ")}</Badge>
                          {m.status !== "completed" && (
                            <Select value={m.status} onValueChange={(v) => handleStatus(m._id, v as any)}>
                              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {user?.role === "startup" && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(m._id)}>
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Milestone Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Collaboration *</Label>
                <Select value={form.applicationId} onValueChange={v => setForm({ ...form, applicationId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a collaboration" /></SelectTrigger>
                  <SelectContent>
                    {acceptedApps.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        No active applications found. Applications need to be pending or accepted.
                      </div>
                    ) : (
                      acceptedApps.map(a => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.applicantName} — {a.problemTitle} ({a.status})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Milestone Title *</Label>
                <Input placeholder="e.g. Complete wireframes" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="What needs to be done?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <Button className="w-full" disabled={saving} onClick={handleAdd}>
                {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Adding...</> : "Add Milestone"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Milestones;
