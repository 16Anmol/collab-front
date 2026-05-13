import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, ArrowLeft, Loader2, Users, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { ratingsApi, messagesApi, type Rating } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ── Star Rating Widget ─────────────────────────────────────────────────────────
const StarRating = ({ value, onChange, size = 24 }: {
  value: number; onChange?: (n: number) => void; size?: number;
}) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n} type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"}
        >
          <Star
            size={size}
            className={
              n <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-200"
            }
          />
        </button>
      ))}
    </div>
  );
};

// ── Ratable person card ────────────────────────────────────────────────────────
const PersonCard = ({ person, onRate, alreadyRated }: {
  person: any; onRate: (p: any) => void; alreadyRated?: Rating;
}) => (
  <div className="flex items-center justify-between py-3.5 px-4 rounded-xl border border-gray-100 bg-white hover:border-primary/20 hover:bg-primary/5 transition-all">
    <div className="flex items-center gap-3">
      {person.avatar
        ? <img src={person.avatar} className="h-10 w-10 rounded-full object-cover"/>
        : <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {person.fullName?.[0]?.toUpperCase()}
          </div>
      }
      <div>
        <p className="font-semibold text-sm text-gray-900">{person.fullName}</p>
        <p className="text-xs text-muted-foreground capitalize">{person.role}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {alreadyRated ? (
        <div className="flex items-center gap-2">
          <StarRating value={alreadyRated.rating} size={14}/>
          <button onClick={() => onRate(person)}
            className="text-xs text-muted-foreground hover:text-primary underline">Edit</button>
        </div>
      ) : (
        <button
          onClick={() => onRate(person)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Star size={12}/> Rate
        </button>
      )}
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const RatingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [myRatings,    setMyRatings]    = useState<Rating[]>([]);
  const [givenRatings, setGivenRatings] = useState<Rating[]>([]);
  const [avgRating,    setAvgRating]    = useState<string | null>(null);
  const [contacts,     setContacts]     = useState<any[]>([]);  // people I can rate
  const [loading,      setLoading]      = useState(true);

  // Dialog state
  const [showRate,    setShowRate]    = useState(false);
  const [ratePerson,  setRatePerson]  = useState<any>(null);
  const [ratingVal,   setRatingVal]   = useState(5);
  const [comment,     setComment]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Load ratings I received
        const { ratings, averageRating } = await ratingsApi.getMine();
        setMyRatings(ratings);
        setAvgRating(averageRating);

        // Load all my conversations to find people I can rate
        const { conversations } = await messagesApi.getConversations();
        const uniquePeople: any[] = [];
        const seen = new Set<string>();
        conversations.forEach((c: any) => {
          const other = c.otherUser;
          if (other && !seen.has(other._id)) {
            seen.add(other._id);
            uniquePeople.push(other);
          }
        });
        setContacts(uniquePeople);

        // Load ratings I have given
        try {
          const { ratings: given } = await ratingsApi.getGiven();
          setGivenRatings(given || []);
        } catch { setGivenRatings([]); }

      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const openRateDialog = (person: any) => {
    setRatePerson(person);
    // Pre-fill if already rated
    const existing = givenRatings.find(r =>
      (typeof r.revieweeId === "string" ? r.revieweeId : (r.revieweeId as any)?._id)?.toString() === person._id
    );
    setRatingVal(existing?.rating || 5);
    setComment(existing?.comment || "");
    setShowRate(true);
  };

  const handleSubmit = async () => {
    if (!ratePerson) return;
    setSubmitting(true);
    try {
      const newRating = await ratingsApi.submitByUser({
        revieweeId: ratePerson._id,
        rating: ratingVal,
        comment,
      });
      // Update given ratings
      setGivenRatings(prev => {
        const filtered = prev.filter(r =>
          (typeof r.revieweeId === "string" ? r.revieweeId : (r.revieweeId as any)?._id)?.toString() !== ratePerson._id
        );
        return [...filtered, newRating];
      });
      toast({ title: `⭐ Rating submitted!`, description: `You rated ${ratePerson.fullName} ${ratingVal}/5 stars.` });
      setShowRate(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false); }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar/>
      <main className="mx-auto max-w-2xl px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={18}/>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Ratings & Feedback</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your reputation on CoHustle</p>
          </div>
        </div>

        {/* My average rating */}
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6 mb-6 flex items-center gap-6">
          <div className="text-center flex-shrink-0">
            <p className="text-5xl font-bold text-primary">{avgRating || "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Your Rating</p>
          </div>
          <div>
            {avgRating
              ? <StarRating value={Math.round(parseFloat(avgRating))} size={22}/>
              : <p className="text-sm text-muted-foreground">No ratings yet</p>}
            <p className="text-sm text-muted-foreground mt-1.5">
              {myRatings.length} review{myRatings.length !== 1 ? "s" : ""} received
            </p>
          </div>
          {givenRatings.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <CheckCircle size={12}/> {givenRatings.length} rating{givenRatings.length !== 1 ? "s" : ""} given
            </div>
          )}
        </div>

        {/* Rate your connections */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-primary"/>
            <h2 className="font-semibold text-gray-900">Rate Your Connections</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-5 w-5 text-primary"/></div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
              <Star size={32} className="mx-auto text-gray-200 mb-2"/>
              <p className="text-sm text-muted-foreground">Start a conversation with someone to rate them.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map(person => {
                const given = givenRatings.find(r =>
                  (typeof r.revieweeId === "string" ? r.revieweeId : (r.revieweeId as any)?._id)?.toString() === person._id
                );
                return <PersonCard key={person._id} person={person} onRate={openRateDialog} alreadyRated={given}/>;
              })}
            </div>
          )}
        </div>

        {/* Reviews I received */}
        {myRatings.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Reviews Received</h2>
            <div className="space-y-3">
              {myRatings.map(r => {
                const reviewer = typeof r.reviewerId === "object" ? r.reviewerId as any : null;
                return (
                  <Card key={r._id} className="border-gray-100">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {reviewer?.fullName?.[0] || "?"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-gray-900">{reviewer?.fullName || "Anonymous"}</p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                          <StarRating value={r.rating} size={16}/>
                          {r.comment && (
                            <p className="text-sm text-muted-foreground mt-1.5 italic">"{r.comment}"</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Rate Dialog */}
        <Dialog open={showRate} onOpenChange={setShowRate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Rate {ratePerson?.fullName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              {/* Person info */}
              <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {ratePerson?.fullName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{ratePerson?.fullName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ratePerson?.role}</p>
                </div>
              </div>

              {/* Stars */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Your Rating</Label>
                <div className="flex items-center gap-3">
                  <StarRating value={ratingVal} onChange={setRatingVal} size={32}/>
                  {ratingVal > 0 && (
                    <span className="text-sm font-medium text-primary">{ratingLabels[ratingVal]}</span>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Comment <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Textarea
                  placeholder="Share your experience working with this person..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button className="w-full" disabled={!ratingVal || submitting} onClick={handleSubmit}>
                {submitting
                  ? <><Loader2 size={14} className="animate-spin mr-2"/>Submitting...</>
                  : <>Submit Rating <Star size={14} className="ml-2 fill-current"/></>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default RatingsPage;
