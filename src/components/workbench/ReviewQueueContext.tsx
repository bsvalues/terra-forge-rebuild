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
import { emitTraceEventAsync } from "@/services/terraTrace";

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
  /** Mark reviewed with trace emission */
  markReviewedWithTrace: (itemId: string, parcelId: string, notes?: string) => void;
  /** Skip with trace emission */
  skipItemWithTrace: (itemId: string, parcelId: string, notes?: string) => void;
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

  const markReviewedWithTrace = useCallback(
    (itemId: string, parcelId: string, notes?: string) => {
      markReviewed.mutate({ itemId, notes });
      emitTraceEventAsync({
        parcelId,
        sourceModule: "os",
        eventType: "review_completed",
        eventData: { queueId: activeQueueId, itemId, notes },
      });
    },
    [markReviewed, activeQueueId]
  );

  const skipItemWithTrace = useCallback(
    (itemId: string, parcelId: string, notes?: string) => {
      skipItem.mutate({ itemId, notes });
      emitTraceEventAsync({
        parcelId,
        sourceModule: "os",
        eventType: "review_skipped",
        eventData: { queueId: activeQueueId, itemId, notes },
      });
    },
    [skipItem, activeQueueId]
  );

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
        markReviewedWithTrace,
        skipItemWithTrace,
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
