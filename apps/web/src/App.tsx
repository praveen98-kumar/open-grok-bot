import { useEffect, useRef, useState, type ReactNode } from "react";
import BotAvatar from "./BotAvatar";
import { bots, chats, user, type Bot, type Message } from "./data";
import { Chevron, Grid, Mic, Plus, Search, Wave } from "./icons";

const primary = bots.find((b) => b.primary)!;
const team = bots.filter((b) => !b.primary);

function IconButton({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <button className={`grid size-10 place-items-center rounded-full bg-raised text-neutral-200 hover:bg-[#2e2e2e] ${className}`}>
      {children}
    </button>
  );
}

function Sidebar({ active, unread, onSelect }: { active: string; unread: Set<string>; onSelect: (id: string) => void }) {
  return (
    <aside className="flex w-[380px] shrink-0 flex-col bg-side">
      <div className="flex justify-end gap-3 px-4 pt-4">
        <IconButton><Search className="size-5" /></IconButton>
        <IconButton><Plus className="size-5" /></IconButton>
      </div>

      <button onClick={() => onSelect(primary.id)} className="mx-auto mt-4 flex flex-col items-center gap-2">
        <BotAvatar shape={primary.shape} color={primary.color} size={80} badge />
        <span className="text-[16px] font-semibold">{primary.name}</span>
      </button>

      <nav className="mt-6 flex-1 overflow-y-auto px-2 [scrollbar-width:none]">
        {team.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b.id)}
            className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left hover:bg-white/[0.04] ${active === b.id ? "bg-white/[0.06]" : ""}`}
          >
            <BotAvatar shape={b.shape} color={b.color} />
            <div className="min-w-0 flex-1">
              <div className="text-[16px] leading-6">{b.name}</div>
              <div className="truncate text-[15px] leading-6 text-muted">{b.status}</div>
            </div>
            <span className={`size-2 shrink-0 rounded-full ${unread.has(b.id) ? "bg-accent" : ""}`} />
          </button>
        ))}
      </nav>

      <div className="flex items-center justify-between px-6 pt-3 text-[15px] text-muted">
        <span>Hidden Bots</span>
        <span>0</span>
      </div>
      <div className="flex items-center gap-3 px-4 pt-2 pb-4">
        <div className="grid size-10 place-items-center rounded-full border border-line bg-[#1c1c1c] text-[15px] font-medium">
          {user.name[0]}
        </div>
        <span className="flex-1 text-[16px]">{user.name}</span>
        <IconButton><Grid className="size-5" /></IconButton>
      </div>
    </aside>
  );
}

// Tiny renderer: **bold** and "- " bullet lines.
function Rich({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
      p.startsWith("**") ? <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong> : p,
    );
  return (
    <>
      {text.split("\n").map((line, i) =>
        line.startsWith("- ") ? (
          <div key={i} className="flex gap-2.5 pl-1.5 [&+div]:mt-1">
            <span className="mt-[11px] size-[5px] shrink-0 rounded-full bg-current" />
            <span>{inline(line.slice(2))}</span>
          </div>
        ) : (
          <div key={i} className="[&+div]:mt-1">{inline(line)}</div>
        ),
      )}
    </>
  );
}

function Bubble({ m }: { m: Message }) {
  return m.from === "user" ? (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-[24px] bg-accent px-4 py-3 text-white">{m.text}</div>
    </div>
  ) : (
    <div className="flex">
      <div className="max-w-[85%] rounded-[18px] border border-white/[0.04] bg-raised px-4 py-3 text-neutral-200">
        <Rich text={m.text} />
      </div>
    </div>
  );
}

function Chat({ bot, messages, onSend }: { bot: Bot; messages: Message[]; onSend: (t: string) => void }) {
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft("");
  };

  return (
    <main className="relative flex min-w-0 flex-1 flex-col">
      <header className="flex h-[72px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-full bg-[#202020] py-2 pr-4 pl-3">
          <BotAvatar shape={bot.shape} color={bot.color} size={26} />
          <span className="text-[17px]">{bot.name}</span>
          <span className="text-[13px] text-muted">claude</span>
        </div>
        <button className="absolute top-4 right-4 rounded-full bg-[#202020] px-4 py-2 text-[15px] hover:bg-raised">Share</button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[948px] flex-col gap-4 px-6 pb-6 text-[16.5px] leading-[1.6]">
          <div className="pt-6 text-center text-[15px] text-muted">Today 6:39 PM</div>
          {messages.length === 0 && (
            <div className="mt-24 text-center text-muted">No messages yet. Say hi to {bot.name}.</div>
          )}
          {messages.map((m, i) => <Bubble key={i} m={m} />)}
          <div ref={end} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[948px] px-6 pb-2">
        <button className="mb-2 ml-5 flex items-center gap-1 text-[13px] text-muted hover:text-neutral-300">
          Default model <Chevron className="size-3" />
        </button>
        <div className="flex items-center gap-3 rounded-full border border-line bg-[#1c1c1c] p-2">
          <button className="grid size-9 place-items-center rounded-full bg-raised text-neutral-300"><Plus className="size-5" /></button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Message ${bot.name}`}
            className="flex-1 bg-transparent text-[17px] outline-none placeholder:text-[#7a7a7a]"
          />
          <button className="grid size-9 place-items-center rounded-full bg-raised text-neutral-300"><Mic className="size-[18px]" /></button>
          <button onClick={send} className="grid size-10 place-items-center rounded-full bg-accent text-white"><Wave className="size-5" /></button>
        </div>
        <p className="pt-2.5 text-center text-[12.5px] text-[#7a7a7a]">
          <span className="font-semibold text-[#9b9b9b]">{primary.name}</span> · open source, self-hosted
        </p>
      </div>
    </main>
  );
}

export default function App() {
  const [active, setActive] = useState(primary.id);
  const [history, setHistory] = useState<Record<string, Message[]>>(chats);
  const [unread, setUnread] = useState(() => new Set(bots.filter((b) => b.unread).map((b) => b.id)));
  const bot = bots.find((b) => b.id === active)!;

  const select = (id: string) => {
    setActive(id);
    setUnread((u) => new Set([...u].filter((x) => x !== id)));
  };

  const send = (text: string) => {
    const id = active;
    setHistory((h) => ({ ...h, [id]: [...(h[id] ?? []), { from: "user", text }] }));
    setTimeout(() => {
      setHistory((h) => ({
        ...h,
        [id]: [...(h[id] ?? []), { from: "bot", text: "On it. (Mock reply: the server isn't wired up yet.)" }],
      }));
    }, 600);
  };

  return (
    <div className="flex h-full">
      <Sidebar active={active} unread={unread} onSelect={select} />
      <Chat bot={bot} messages={history[active] ?? []} onSend={send} />
    </div>
  );
}
