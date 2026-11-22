export type Shape = "superbot" | "dome" | "pentagon" | "oval" | "capsule" | "circle" | "burst" | "heart" | "tilted";

export type Bot = {
  id: string;
  name: string;
  status: string;
  color: string;
  shape: Shape;
  unread?: boolean;
  primary?: boolean;
};

export type Message = { from: "user" | "bot"; text: string };

export const user = { name: "David" };

export const bots: Bot[] = [
  { id: "superbot", name: "SuperBot", status: "Coordinating your team.", color: "#2f7bf5", shape: "superbot", primary: true },
  { id: "developer", name: "Developer", status: "Running tests...", color: "#3fbf6a", shape: "dome" },
  { id: "deploy", name: "Deploy", status: "Shipped v0.4.2 to prod.", color: "#f2a93b", shape: "pentagon" },
  { id: "researcher", name: "Researcher", status: "Found 12 competitors. Summary in your inbox.", color: "#8b5cf6", shape: "oval", unread: true },
  { id: "expenses", name: "Expenses", status: "Logged 4 receipts from this week.", color: "#3cb4a4", shape: "capsule" },
  { id: "inbox", name: "Inbox", status: "2 emails need your reply.", color: "#f4f4f4", shape: "circle", unread: true },
  { id: "social", name: "Social", status: "Drafted 3 posts for tomorrow.", color: "#ec4899", shape: "burst" },
  { id: "recruiter", name: "Recruiter", status: "Booked 2 intro calls for Thursday.", color: "#ef4444", shape: "heart" },
  { id: "calendar", name: "Calendar", status: "Moved your 3pm to Friday.", color: "#f07a3a", shape: "tilted" },
];

export const chats: Record<string, Message[]> = {
  superbot: [
    { from: "user", text: "Morning. What did the team get done overnight?" },
    {
      from: "bot",
      text: [
        "Morning David. Here's the overnight recap:",
        "- **Developer** fixed the login bug and is running tests.",
        "- **Deploy** shipped v0.4.2 to prod. No errors so far.",
        "- **Researcher** finished the competitor list (12 companies).",
        "- **Expenses** logged 4 receipts.",
        "One thing needs you: **Inbox** has 2 emails waiting on your reply.",
      ].join("\n"),
    },
    { from: "user", text: "Nice. Have Researcher send me the top 3." },
    {
      from: "bot",
      text: "Done. I asked Researcher to send you the top 3 with pricing and a one-line take on each. It should land in a few minutes.",
    },
  ],
};
