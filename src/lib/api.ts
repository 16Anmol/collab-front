const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken(): string | null {
  return localStorage.getItem("cohustle_token");
}

export function saveToken(token: string) {
  localStorage.setItem("cohustle_token", token);
}

export function clearToken() {
  localStorage.removeItem("cohustle_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const authApi = {
  getMe: () => request<User>("/auth/me"),
  signOut: () => request("/auth/signout", { method: "POST" }),
  // Always forces Google account-picker screen so user can switch accounts
  googleLoginUrl: () => `${BASE}/auth/google`,
};

// ── Profile ────────────────────────────────────────────────────────────────────
export const profileApi = {
  setRole: (role: "startup" | "freelancer") =>
    request("/profile/role", { method: "POST", body: JSON.stringify({ role }) }),

  saveStartup: (data: StartupOnboardingData) =>
    request("/profile/startup", { method: "POST", body: JSON.stringify(data) }),

  saveFreelancer: (data: FreelancerOnboardingData) =>
    request("/profile/freelancer", { method: "POST", body: JSON.stringify(data) }),

  getMe: () => request<FullProfile>("/profile/me"),

  getMatches: () => request<{ matches: MatchUser[] }>("/profile/matches"),

  updateTags: (tags: string[]) =>
    request("/profile/tags", { method: "PATCH", body: JSON.stringify({ tags }) }),

  getPublic: (userId: string) =>
    request<{ user: any; profile: any }>(`/profile/${userId}`),
  updateStartup: (data: {
    startupName?: string; industry?: string; description?: string;
    fundingStage?: string; website?: string; location?: string; tags?: string[];
    teamSize?: string; linkedinPage?: string; companyDocument?: string;
    identityProof?: string; pitchDeck?: string;
  }) =>
    request("/profile/startup", { method: "PATCH", body: JSON.stringify(data) }),

  updateFreelancer: (data: {
    bio?: string; experience?: string; portfolioLink?: string;
    hourlyRate?: number; skills?: string[]; tags?: string[];
    githubLink?: string; linkedinLink?: string; location?: string;
    availability?: string; identityProof?: string; resumeLink?: string;
  }) =>
    request("/profile/freelancer", { method: "PATCH", body: JSON.stringify(data) }),
};

// ── Problems ───────────────────────────────────────────────────────────────────
export const problemsApi = {
  getAll: (params?: {
    tags?: string; search?: string; page?: number; limit?: number;
    sortBy?: string; timeline?: string; location?: string;
    budgetMin?: number; budgetMax?: number;
    dateFrom?: string; dateTo?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.tags)      q.set("tags",      params.tags);
    if (params?.search)    q.set("search",    params.search);
    if (params?.page)      q.set("page",      String(params.page));
    if (params?.limit)     q.set("limit",     String(params.limit));
    if (params?.sortBy)    q.set("sortBy",    params.sortBy);
    if (params?.timeline)  q.set("timeline",  params.timeline);
    if (params?.location)  q.set("location",  params.location);
    if (params?.budgetMin !== undefined) q.set("budgetMin", String(params.budgetMin));
    if (params?.budgetMax !== undefined) q.set("budgetMax", String(params.budgetMax));
    if (params?.dateFrom)  q.set("dateFrom",  params.dateFrom);
    if (params?.dateTo)    q.set("dateTo",    params.dateTo);
    return request<{ problems: Problem[]; total: number; allTags: string[]; allLocations: string[] }>(`/problems?${q}`);
  },

  getMine: () => request<{ problems: Problem[] }>("/problems/mine"),

  getById: (id: string) => request<Problem>(`/problems/${id}`),

  create: (data: CreateProblemData) =>
    request<Problem>("/problems", { method: "POST", body: JSON.stringify(data) }),

  updateStatus: (id: string, status: string) =>
    request(`/problems/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  apply: (id: string, proposal: {
    coverNote: string;
    skills?: string[];
    pastProjects?: string;
    portfolioLink?: string;
  resumeLink?: string;
    deliveryTimeline?: string;
    expectedBudget?: string;
  }) =>
    request(`/problems/${id}/apply`, { method: "POST", body: JSON.stringify(proposal) }),

  getApplications: (problemId: string) =>
    request<{ applications: Application[] }>(`/problems/${problemId}/applications`),
};

// ── Applications ───────────────────────────────────────────────────────────────
export const applicationsApi = {
  getMine: () => request<{ applications: Application[] }>("/applications/mine"),
  getReceived: () => request<{ applications: Application[] }>("/applications/received"),
  getByProblem: (problemId: string) => request<{ applications: Application[] }>(`/applications/by-problem/${problemId}`),
  getById: (id: string) => request<Application>(`/applications/${id}`),
  updateStatus: (id: string, status: AppStatus) =>
    request(`/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  bulkStatus: (problemId: string, newStatus: AppStatus, excludeIds?: string[]) =>
    request("/applications/bulk-status", { method: "PATCH", body: JSON.stringify({ problemId, newStatus, excludeIds }) }),
  scheduleMeeting: (id: string, date: string, timeSlot: string) =>
    request(`/applications/${id}/schedule-meeting`, { method: "POST", body: JSON.stringify({ date, timeSlot }) }),
};

// ── Messages ───────────────────────────────────────────────────────────────────
export const messagesApi = {
  getConversations: () =>
    request<{ conversations: Conversation[] }>("/messages/conversations"),

  startConversation: (otherUserId: string) =>
    request<Conversation>("/messages/conversations", {
      method: "POST",
      body: JSON.stringify({ otherUserId }),
    }),

  getMessages: (conversationId: string) =>
    request<{ messages: Message[] }>(`/messages/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, content: string) =>
    request<Message>(`/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  getUnreadCount: () =>
    request<{ unreadCount: number }>("/messages/unread-count"),

  // Returns only users the current user has an active application with
  getConnections: () =>
    request<{ connections: (User & { connectionStatus: string; problemTitle: string })[] }>("/messages/connections"),

  scheduleMeetingInChat: (conversationId: string, date: string, timeSlot: string) =>
    request<{ success: boolean; meeting: ChatMeeting }>(`/messages/conversations/${conversationId}/schedule-meeting`, {
      method: "POST",
      body: JSON.stringify({ date, timeSlot }),
    }),

  getMeetings: (conversationId: string) =>
    request<{ meetings: ChatMeeting[] }>(`/messages/conversations/${conversationId}/meetings`),
  endMeeting: (conversationId: string, roomId: string) =>
    request(`/messages/conversations/${conversationId}/meetings/${roomId}/end`, { method: "PATCH" }),
  endMeetingByRoomId: (roomId: string) =>
    request(`/messages/meetings/${roomId}/end`, { method: "PATCH" }),
};

// ── Types ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  role: "startup" | "freelancer" | null;
  onboarded: boolean;
  tags: string[];
}

export interface FullProfile extends User {
  startupProfile?: StartupProfile;
  freelancerProfile?: FreelancerProfile;
}

export interface StartupProfile {
  _id: string;
  startupName: string;
  industry?: string;
  description?: string;
  fundingStage?: string;
  website?: string;
  location?: string;
}

export interface FreelancerProfile {
  _id: string;
  skills: string[];
  experience?: string;
  portfolioLink?: string;
  hourlyRate?: number;
  bio?: string;
}

export interface Problem {
  _id: string;
  startupUserId: any; // populated with { fullName, avatar } from backend
  title: string;
  description: string;
  tags: string[];
  budget: string;
  budgetMin?: number;
  budgetMax?: number;
  timeline: string;
  location?: string;
  status: "open" | "in_progress" | "closed";
  applicationCount: number;
  createdAt: string;
}

export type AppStatus = "pending" | "selected" | "finalised" | "better_luck" | "accepted" | "rejected";

export interface Meeting {
  date: string;
  timeSlot: string;
  link: string;
  scheduled: boolean;
}

export interface Application {
  _id: string;
  problemId: string;
  problemTitle: string;
  startupUserId: string;
  freelancerUserId: string;
  applicantName: string;
  pitch?: string;
  coverNote?: string;
  skills?: string[];
  pastProjects?: string;
  resumeLink?: string;
  githubLink?: string;
  linkedinLink?: string;
  portfolioLink?: string;
  deliveryTimeline?: string;
  expectedBudget?: string;
  status: AppStatus;
  meeting?: Meeting;
  createdAt: string;
}

export interface ChatMeeting {
  roomId: string;
  date: string;       // "2026-04-25"
  timeSlot: string;   // "10:30 AM"
  scheduledBy: string;
  scheduledAt: string;
  joinLink: string;
  status: "upcoming" | "active" | "ended";
}

export interface Conversation {
  _id: string;
  participants: User[];
  otherUser: any; // populated from MongoDB - uses _id not id
  lastMessage: string;
  lastMessageAt: string;
  unreadCount?: number;
  meetings?: ChatMeeting[];
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface MatchUser {
  _id: string;
  fullName: string;
  avatar?: string;
  tags: string[];
  sharedTagCount: number;
  profile?: StartupProfile | FreelancerProfile;
}

export interface StartupOnboardingData {
  startupName: string;
  industry?: string;
  description?: string;
  fundingStage?: string;
  website?: string;
  location?: string;
  tags?: string[];
}

export interface FreelancerOnboardingData {
  skills: string[];
  experience?: string;
  portfolioLink?: string;
  hourlyRate?: number;
  bio?: string;
  tags?: string[];
}

export interface CreateProblemData {
  title: string;
  description: string;
  tags?: string[];
  budget?: string;
  budgetMin?: number;
  budgetMax?: number;
  timeline?: string;
  location?: string;
}

// ── Milestones ─────────────────────────────────────────────────────────────────
export const milestonesApi = {
  create: (data: { applicationId: string; title: string; description?: string; dueDate?: string }) =>
    request<Milestone>("/milestones", { method: "POST", body: JSON.stringify(data) }),

  getMine: () => request<{ milestones: Milestone[] }>("/milestones/mine"),

  getByApplication: (applicationId: string) =>
    request<{ milestones: Milestone[] }>(`/milestones/application/${applicationId}`),

  updateStatus: (id: string, status: "pending" | "in_progress" | "completed") =>
    request<Milestone>(`/milestones/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  delete: (id: string) =>
    request(`/milestones/${id}`, { method: "DELETE" }),
};

// ── Ratings ────────────────────────────────────────────────────────────────────
export const ratingsApi = {
  submit: (data: { applicationId: string; rating: number; comment?: string }) =>
    request<Rating>("/ratings", { method: "POST", body: JSON.stringify(data) }),
  submitByUser: (data: { revieweeId: string; rating: number; comment?: string }) =>
    request<Rating>("/ratings/by-user", { method: "POST", body: JSON.stringify(data) }),
  getGiven: () =>
    request<{ ratings: Rating[] }>("/ratings/given"),

  getMine: () => request<{ ratings: Rating[]; averageRating: string | null; totalRatings: number }>("/ratings/mine"),

  getForUser: (userId: string) =>
    request<{ ratings: Rating[]; averageRating: string | null; totalRatings: number }>(`/ratings/user/${userId}`),
};

// ── Collab Requests (S2S) ──────────────────────────────────────────────────────
export interface CollabPitch {
  _id: string;
  collabRequestId: string;
  collabPostTitle: string;
  receiverUserId: string;
  pitcherUserId: string;
  pitcherName: string;
  startupName: string;
  tagline: string;
  sector: string;
  stage: string;
  teamSize: string;
  location: string;
  whatYouOffer: string;
  yourTech: string[];
  pastWins: string;
  collabGoal: string;
  collabType: string;
  yourAsk: string;
  timeline: string;
  website: string;
  linkedin: string;
  demoLink: string;
  status: "pending" | "connected";
  createdAt: string;
}

export const collabPitchesApi = {
  submit: (data: Partial<CollabPitch> & { collabRequestId: string }) =>
    request<{ pitch: CollabPitch }>("/collab-pitches", { method: "POST", body: JSON.stringify(data) }),
  getForPost: (collabRequestId: string) =>
    request<{ pitches: CollabPitch[]; postTitle: string }>(`/collab-pitches/for/${collabRequestId}`),
  getMine: () =>
    request<{ pitches: CollabPitch[] }>("/collab-pitches/mine"),
  connect: (id: string) =>
    request<{ success: boolean; pitch: CollabPitch }>(`/collab-pitches/${id}/connect`, { method: "PATCH" }),
  getById: (id: string) =>
    request<{ pitch: CollabPitch }>(`/collab-pitches/${id}`),
  migrateFromChat: () =>
    request<{ success: boolean; created: number; skipped: number; total: number }>("/collab-pitches/migrate-from-chat", { method: "POST" }),
};

export const collabApi = {
  create: (data: { title: string; description: string; lookingFor: string; tags?: string[] }) =>
    request<CollabRequest>("/collab-requests", { method: "POST", body: JSON.stringify(data) }),

  getAll: (params?: { lookingFor?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.lookingFor) q.set("lookingFor", params.lookingFor);
    if (params?.page) q.set("page", String(params.page));
    return request<{ requests: CollabRequest[]; total: number }>(`/collab-requests?${q}`);
  },

  getMine: () => request<{ requests: CollabRequest[] }>("/collab-requests/mine"),

  delete: (id: string) => request(`/collab-requests/${id}`, { method: "DELETE" }),
};

// ── Admin ──────────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => request<{ stats: AdminStats }>("/admin/stats"),
  getUsers: (params?: { role?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.role) q.set("role", params.role);
    if (params?.page) q.set("page", String(params.page));
    return request<{ users: User[]; total: number }>(`/admin/users?${q}`);
  },
  deleteUser: (id: string) => request(`/admin/users/${id}`, { method: "DELETE" }),
  getProblems: (params?: { status?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    return request<{ problems: Problem[]; total: number }>(`/admin/problems?${q}`);
  },
  deleteProblem: (id: string) => request(`/admin/problems/${id}`, { method: "DELETE" }),
  getRatings: () => request<{ ratings: Rating[] }>("/admin/ratings"),
};

// ── Additional Types ───────────────────────────────────────────────────────────
export interface Milestone {
  _id: string;
  problemId: string;
  applicationId: string;
  startupUserId: string;
  freelancerUserId: string;
  title: string;
  description: string;
  dueDate?: string;
  status: "pending" | "in_progress" | "completed";
  completedAt?: string;
  createdAt: string;
}

export interface Rating {
  _id: string;
  applicationId: string;
  problemId: string;
  reviewerId: User | string;
  revieweeId: User | string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CollabRequest {
  _id: string;
  userId: User | string;
  title: string;
  description: string;
  lookingFor: string;
  tags: string[];
  status: "open" | "closed";
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  startups: number;
  freelancers: number;
  totalProblems: number;
  openProblems: number;
  totalApplications: number;
  acceptedApplications: number;
  collabRequests: number;
  milestones: number;
  ratings: number;
}
