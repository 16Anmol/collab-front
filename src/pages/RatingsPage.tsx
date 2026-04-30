import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, ArrowLeft, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { ratingsApi, applicationsApi, type Rating, type Application } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const StarRating = ({ value, onChange }: { value: number; onChange?: (n: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(n => (
      <button
        key={n}
        type="button"
        onClick={() => onChange?.(n)}
        className={onChange ? "cursor-pointer" : "cursor-default"}
      >
        <Star
          size={24}
          className={n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}
        />
      </button>
    ))}
  </div>
);

const RatingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [myRatings, setMyRatings] = useState<Rating[]>([]);
  const [avgRating, setAvgRating] = useState<string | null>(null);
  const [acceptedApps, setAcceptedApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRate, setShowRate] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    ratingsApi.getMine().then(({ ratings, averageRating }) => {
      setMyRatings(ratings);
      setAvgRating(averageRating);
    }).finally(() => setLoading(false));

    const appsPromise = user?.role === "startup"
      ? applicationsApi.getReceived()
      : applicationsApi.getMine();

    appsPromise.then(({ applications }) =>
      setAcceptedApps(applications.filter(a => a.status === "accepted"))
    );
  }, [user]);

  const handleSubmit = async () => {
    if (!selectedApp) return;
    setSubmitting(true);
    try {
      await ratingsApi.submit({ applicationId: selectedApp._id, rating: ratingVal, comment });
      toast({ title: "Rating submitted! Thank you." });
      setShowRate(false);
      setComment("");
      setRatingVal(5);
      const { ratings, averageRating } = await ratingsApi.getMine();
      setMyRatings(ratings);
      setAvgRating(averageRating);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={18} /></Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ratings & Feedback</h1>
            <p className="text-muted-foreground mt-1">Your reputation on CoHustle</p>
          </div>
        </div>

        {/* Average rating card */}
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardContent className="flex items-center gap-6 p-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-primary">{avgRating || "—"}</p>
              <p className="text-sm text-muted-foreground mt-1">Average Rating</p>
            </div>
            <div>
              {avgRating && <StarRating value={Math.round(parseFloat(avgRating))} />}
              <p className="text-sm text-muted-foreground mt-2">{myRatings.length} review{myRatings.length !== 1 ? "s" : ""} received</p>
            </div>
            {acceptedApps.length > 0 && (
              <Button className="ml-auto" onClick={() => setShowRate(true)}>
                <Star size={16} /> Rate a Collaboration
              </Button>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
        ) : myRatings.length === 0 ? (
          <div className="text-center py-12">
            <Star className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">No ratings yet. Complete a collaboration to receive your first review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Reviews Received</h2>
            {myRatings.map(r => {
              const reviewer = typeof r.reviewerId === "object" ? r.reviewerId : null;
              return (
                <Card key={r._id}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                        {reviewer?.fullName?.[0] || "?"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground">{reviewer?.fullName || "Anonymous"}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <StarRating value={r.rating} />
                        {r.comment && <p className="text-sm text-muted-foreground mt-2 italic">"{r.comment}"</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Rate Dialog */}
        <Dialog open={showRate} onOpenChange={setShowRate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rate a Collaboration</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Select Collaboration</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedApp?._id || ""}
                  onChange={e => setSelectedApp(acceptedApps.find(a => a._id === e.target.value) || null)}
                >
                  <option value="">Choose a collaboration...</option>
                  {acceptedApps.map(a => (
                    <option key={a._id} value={a._id}>{a.problemTitle} — {a.applicantName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Your Rating</Label>
                <StarRating value={ratingVal} onChange={setRatingVal} />
              </div>
              <div className="space-y-2">
                <Label>Comment (optional)</Label>
                <Textarea
                  placeholder="Share your experience working together..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={4}
                />
              </div>
              <Button className="w-full" disabled={!selectedApp || submitting} onClick={handleSubmit}>
                {submitting ? <><Loader2 size={14} className="animate-spin mr-2" />Submitting...</> : "Submit Rating"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default RatingsPage;
