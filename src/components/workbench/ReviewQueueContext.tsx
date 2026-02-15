import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  useReviewQueues,
  useReviewQueueItems,
  useCreateReviewQueue,
  useMarkReviewed,
  useSkipItem,
  useQueueNavigation,
  ReviewQueue,
  ReviewQueueItem,
} from "@/hooks/useReviewQueue";

interface ReviewQueueContextValue {
  activeQueueId: string | null;
  setActiveQueueId: (id: string | null) => void;
  queues: ReviewQueue[] | undefined;
  items: ReviewQueueItem[] | undefined;
  nav: ReturnType<typeof useQueueNavigation>;
  createQueue: ReturnType<typeof useCreateReviewQueue>;
  markReviewed: ReturnType<typeof useMarkReviewed>;
  skipItem: ReturnType<typeof useSkipItem>;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const ReviewQueueCtx = createContext<ReviewQueueContextValue | null>(null);

export function ReviewQueueProvider({ children }: { children: ReactNode }) {
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: queues } = useReviewQueues();
  const { data: items } = useReviewQueueItems(activeQueueId);
  const createQueue = useCreateReviewQueue();
  const markReviewed = useMarkReviewed();
  const skipItem = useSkipItem();
  const nav = useQueueNavigation(items);

  return (
    <ReviewQueueCtx.Provider
      value={{
        activeQueueId,
        setActiveQueueId,
        queues,
        items,
        nav,
        createQueue,
        markReviewed,
        skipItem,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </ReviewQueueCtx.Provider>
  );
}

export function useReviewQueueContext() {
  const ctx = useContext(ReviewQueueCtx);
  if (!ctx) throw new Error("useReviewQueueContext must be used within ReviewQueueProvider");
  return ctx;
}
