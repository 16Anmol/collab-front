import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User, LayoutDashboard, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const { user, profile, signInWithGoogle, signOut, loading } = useAuth();
  const navigate      = useNavigate();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);

  const dashboardPath = profile?.role ? `/${profile.role}/dashboard` : "/select-role";

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    setLoggingOut(false);
    setShowLogout(false);
    navigate("/", { replace: true });
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">

          {/* Logo */}
          <Link to="/" className="text-xl font-bold text-foreground">
            Co<span className="text-primary">Hustle</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 md:flex">
            <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Explore
            </Link>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>

            {/* NOT logged in */}
            {!loading && !user && (
              <Button size="sm" onClick={signInWithGoogle}>
                Sign in with Google
              </Button>
            )}

            {/* Logged in */}
            {!loading && user && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(dashboardPath)}>
                  <LayoutDashboard size={15} className="mr-1.5" />
                  Dashboard
                </Button>

                {/* Avatar dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.fullName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                          {user.fullName?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <ChevronDown size={14} className="text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-52">
                    {/* User info */}
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-foreground truncate">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {profile?.role && (
                        <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                          {profile.role}
                        </span>
                      )}
                    </div>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User size={14} className="mr-2" /> My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(dashboardPath)}>
                      <LayoutDashboard size={14} className="mr-2" /> Dashboard
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setShowLogout(true)}
                    >
                      <LogOut size={14} className="mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-border bg-background px-6 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              <Link to="/explore" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Explore</Link>
              <Link to="/about"   className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>About</Link>

              {!loading && !user && (
                <Button size="sm" className="w-fit" onClick={() => { setMobileOpen(false); signInWithGoogle(); }}>
                  Sign in with Google
                </Button>
              )}

              {!loading && user && (
                <>
                  {/* Mobile user info */}
                  <div className="flex items-center gap-3 py-1">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.fullName} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {user.fullName?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-fit" onClick={() => { setMobileOpen(false); navigate("/profile"); }}>
                    <User size={14} className="mr-1.5" /> My Profile
                  </Button>
                  <Button variant="outline" size="sm" className="w-fit" onClick={() => { setMobileOpen(false); navigate(dashboardPath); }}>
                    <LayoutDashboard size={14} className="mr-1.5" /> Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit text-destructive hover:text-destructive"
                    onClick={() => { setMobileOpen(false); setShowLogout(true); }}
                  >
                    <LogOut size={14} className="mr-1.5" /> Sign Out
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Logout confirmation dialog ─────────────────────────────────────────── */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of CoHustle?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in with Google again to access your dashboard, messages, and collaborations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loggingOut}
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loggingOut ? "Signing out…" : "Yes, sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Navbar;
