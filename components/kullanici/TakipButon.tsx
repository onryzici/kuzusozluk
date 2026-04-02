"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";

type TakipButonProps = {
  targetUsername: string;
  initialIsFollowing: boolean;
};

export default function TakipButon({ targetUsername, initialIsFollowing }: TakipButonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    const previousState = isFollowing;

    // Optimistic update
    setIsFollowing(!isFollowing);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/kullanici/${targetUsername}/takip`, {
        method: previousState ? "DELETE" : "POST",
      });

      const json = await res.json();

      if (!json.success) {
        // Revert on error
        setIsFollowing(previousState);
      }
    } catch {
      // Revert on error
      setIsFollowing(previousState);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      onClick={handleToggle}
      disabled={isLoading}
      className="h-7 text-xs gap-1"
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="h-3 w-3" />
          takip ediliyor
        </>
      ) : (
        <>
          <UserPlus className="h-3 w-3" />
          takip et
        </>
      )}
    </Button>
  );
}
