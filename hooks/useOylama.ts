"use client";

import { useState, useCallback } from "react";

type VoteType = "UP" | "DOWN" | null;

export function useOylama(
  entryId: string,
  initialUpvotes: number,
  initialDownvotes: number,
  initialUserVote: VoteType
) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<VoteType>(initialUserVote);
  const [isLoading, setIsLoading] = useState(false);

  const oyVer = useCallback(
    async (type: "UP" | "DOWN") => {
      if (isLoading) return;

      // Optimistic update
      const prevUpvotes = upvotes;
      const prevDownvotes = downvotes;
      const prevUserVote = userVote;

      if (userVote === type) {
        // Geri çek
        setUserVote(null);
        if (type === "UP") setUpvotes((v) => v - 1);
        else setDownvotes((v) => v - 1);
      } else if (userVote) {
        // Oy değiştir
        setUserVote(type);
        if (type === "UP") {
          setUpvotes((v) => v + 1);
          setDownvotes((v) => v - 1);
        } else {
          setDownvotes((v) => v + 1);
          setUpvotes((v) => v - 1);
        }
      } else {
        // Yeni oy
        setUserVote(type);
        if (type === "UP") setUpvotes((v) => v + 1);
        else setDownvotes((v) => v + 1);
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/entry/${entryId}/oy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        if (!res.ok) throw new Error();
      } catch {
        // Rollback
        setUpvotes(prevUpvotes);
        setDownvotes(prevDownvotes);
        setUserVote(prevUserVote);
      } finally {
        setIsLoading(false);
      }
    },
    [entryId, upvotes, downvotes, userVote, isLoading]
  );

  return { upvotes, downvotes, userVote, oyVer, isLoading };
}
