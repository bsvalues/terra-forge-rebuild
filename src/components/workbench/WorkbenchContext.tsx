import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { isEmbedMode } from "@/lib/splitView";
import { createWindowId, isParcelLinkEnabled, loadLastLinkedParcel, publishParcel, subscribeParcelLink, subscribeParcelLinkToggle } from "@/lib/parcelLink";
import { 
  WorkbenchContext as WorkbenchContextType, 
  WorkMode, 
  SuiteTab, 
  PilotMode, 
  SystemState,
  ParcelContext,
  StudyPeriodContext,
  WORK_MODE_CONFIGS 
} from "./types";

interface WorkbenchProviderProps {
  children: ReactNode;
}

interface WorkbenchContextValue extends WorkbenchContextType {
  setParcel: (parcel: Partial<ParcelContext>) => void;
  setStudyPeriod: (period: Partial<StudyPeriodContext>) => void;
  setWorkMode: (mode: WorkMode) => void;
  setActiveTab: (tab: SuiteTab) => void;
  setPilotMode: (mode: PilotMode) => void;
  setSystemState: (state: SystemState) => void;
  clearParcel: () => void;
}

const defaultParcel: ParcelContext = {
  id: null,
  parcelNumber: null,
  address: null,
  city: null,
  assessedValue: null,
  propertyClass: null,
  neighborhoodCode: null,
  latitude: null,
  longitude: null,
};

const defaultStudyPeriod: StudyPeriodContext = {
  id: null,
  name: null,
  status: null,
  startDate: null,
  endDate: null,
};

const WorkbenchCtx = createContext<WorkbenchContextValue | null>(null);

export function WorkbenchProvider({ children }: WorkbenchProviderProps) {
  // A side window (embed mode) opens on the parcel already in focus in this tab.
  const [parcel, setParcelState] = useState<ParcelContext>(() =>
    (typeof window !== "undefined" && isEmbedMode(window.location.search) && loadLastLinkedParcel()) || defaultParcel
  );
  const [windowId] = useState(createWindowId);
  const [studyPeriod, setStudyPeriodState] = useState<StudyPeriodContext>(defaultStudyPeriod);
  const [workMode, setWorkModeState] = useState<WorkMode>("overview");
  const [activeTab, setActiveTabState] = useState<SuiteTab>("summary");
  const [pilotMode, setPilotModeState] = useState<PilotMode>("pilot");
  const [systemState, setSystemStateState] = useState<SystemState>("idle");

  // Announce parcel changes made in this window (only when the parcel itself changes).
  const lastPublished = useRef<string | null>(parcel.id);

  // Link on/off: when off, this window keeps its own parcel so two different
  // parcels can be compared side by side.
  const [linkEnabled, setLinkEnabled] = useState(isParcelLinkEnabled);
  useEffect(() => subscribeParcelLinkToggle(setLinkEnabled), []);

  // Follow parcels opened in the other window, without echoing them back.
  useEffect(() => {
    if (!linkEnabled) return;
    return subscribeParcelLink(windowId, (p) => {
      lastPublished.current = p.id;
      setParcelState(p);
    });
  }, [windowId, linkEnabled]);
  useEffect(() => {
    if (linkEnabled && parcel.id && parcel.id !== lastPublished.current) {
      lastPublished.current = parcel.id;
      publishParcel(windowId, parcel);
    }
  }, [parcel, windowId, linkEnabled]);

  const setParcel = useCallback((updates: Partial<ParcelContext>) => {
    setParcelState(prev => ({ ...prev, ...updates }));
  }, []);

  const clearParcel = useCallback(() => {
    setParcelState(defaultParcel);
  }, []);

  const setStudyPeriod = useCallback((updates: Partial<StudyPeriodContext>) => {
    setStudyPeriodState(prev => ({ ...prev, ...updates }));
  }, []);

  const setWorkMode = useCallback((mode: WorkMode) => {
    setWorkModeState(mode);
    // Auto-switch to default tab for this mode
    const config = WORK_MODE_CONFIGS[mode];
    setActiveTabState(config.defaultTab);
  }, []);

  const setActiveTab = useCallback((tab: SuiteTab) => {
    setActiveTabState(tab);
  }, []);

  const setPilotMode = useCallback((mode: PilotMode) => {
    setPilotModeState(mode);
  }, []);

  const setSystemState = useCallback((state: SystemState) => {
    setSystemStateState(state);
  }, []);

  const value: WorkbenchContextValue = {
    parcel,
    studyPeriod,
    workMode,
    activeTab,
    pilotMode,
    systemState,
    setParcel,
    setStudyPeriod,
    setWorkMode,
    setActiveTab,
    setPilotMode,
    setSystemState,
    clearParcel,
  };

  return (
    <WorkbenchCtx.Provider value={value}>
      {children}
    </WorkbenchCtx.Provider>
  );
}

export function useWorkbench() {
  const context = useContext(WorkbenchCtx);
  if (!context) {
    throw new Error("useWorkbench must be used within a WorkbenchProvider");
  }
  return context;
}
