"use client";

import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import Link from "next/link";

type PollOption = {
  id: string;
  text: string;
  voteCount: number;
};

type Poll = {
  id: string;
  question: string;
  authorUsername: string;
  createdAt: string;
  expiresAt: string | null;
  totalVotes: number;
  userVotedOptionId: string | null;
  options: PollOption[];
};

type AnketGosterProps = {
  topicSlug: string;
  isLoggedIn: boolean;
};

export default function AnketGoster({ topicSlug, isLoggedIn }: AnketGosterProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPolls() {
      try {
        const res = await fetch(`/api/baslik/${topicSlug}/anket`);
        const data = await res.json();
        if (data.success) {
          setPolls(data.data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchPolls();
  }, [topicSlug]);

  if (loading || polls.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {polls.map((poll) => (
        <AnketKart key={poll.id} poll={poll} isLoggedIn={isLoggedIn} />
      ))}
    </div>
  );
}

function AnketKart({ poll, isLoggedIn }: { poll: Poll; isLoggedIn: boolean }) {
  const [currentPoll, setCurrentPoll] = useState(poll);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasVoted = currentPoll.userVotedOptionId !== null;
  const showResults = hasVoted;

  async function handleVote() {
    if (!selectedOption || !isLoggedIn) return;
    setVoting(true);
    setError(null);

    try {
      const res = await fetch(`/api/anket/${currentPoll.id}/oy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: selectedOption }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentPoll((prev) => ({
          ...prev,
          totalVotes: data.data.totalVotes,
          userVotedOptionId: data.data.userVotedOptionId,
          options: data.data.options,
        }));
      } else {
        setError(data.error?.message || "bir hata olustu");
      }
    } catch {
      setError("bir hata olustu");
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{currentPoll.question}</span>
      </div>

      {showResults ? (
        <div className="space-y-2">
          {currentPoll.options.map((opt) => {
            const percentage =
              currentPoll.totalVotes > 0
                ? Math.round((opt.voteCount / currentPoll.totalVotes) * 100)
                : 0;
            const isUserVote = opt.id === currentPoll.userVotedOptionId;

            return (
              <div key={opt.id} className="relative">
                <div
                  className="absolute inset-0 rounded bg-primary/10"
                  style={{ width: `${percentage}%` }}
                />
                <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                  <span className={isUserVote ? "font-medium text-primary" : ""}>
                    {opt.text}
                    {isUserVote && " \u2713"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {percentage}% ({opt.voteCount})
                  </span>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground mt-2">
            toplam {currentPoll.totalVotes} oy
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentPoll.options.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-center gap-2 px-3 py-2 rounded border text-sm cursor-pointer transition-colors ${
                selectedOption === opt.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name={`poll-${currentPoll.id}`}
                value={opt.id}
                checked={selectedOption === opt.id}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="accent-primary"
                disabled={!isLoggedIn}
              />
              {opt.text}
            </label>
          ))}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {isLoggedIn ? (
            <button
              onClick={handleVote}
              disabled={!selectedOption || voting}
              className="mt-2 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {voting ? "gonderiliyor..." : "oy ver"}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">
              oy vermek icin{" "}
              <Link href="/giris" className="text-primary hover:underline">
                giris yap
              </Link>
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        <Link href={`/kullanici/${currentPoll.authorUsername}`} className="hover:underline">
          {currentPoll.authorUsername}
        </Link>
      </p>
    </div>
  );
}
