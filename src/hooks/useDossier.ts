// TerraFusion OS — Dossier Suite Hooks
// Queries for documents, narratives, and packets

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emitTraceEventAsync } from "@/services/terraTrace";
import { invalidateDossier } from "@/lib/queryInvalidation";
import { showChangeReceipt } from "@/lib/changeReceipt";

// ---- Documents ----

export function useDossierDocuments(parcelId: string | null) {
  return useQuery({
    queryKey: ["dossier-documents", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossier_documents")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!parcelId,
  });
}

export function useUploadDocument(parcelId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      documentType,
      description,
    }: {
      file: File;
      documentType: string;
      description?: string;
    }) => {
      if (!parcelId) throw new Error("No parcel selected");

      // Upload to storage
      const filePath = `${parcelId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("dossier-files")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Insert document record
      const { data, error } = await supabase
        .from("dossier_documents")
        .insert({
          parcel_id: parcelId,
          file_name: file.name,
          file_path: filePath,
          file_size_bytes: file.size,
          mime_type: file.type,
          document_type: documentType,
          description: description || null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      emitTraceEventAsync({
        parcelId,
        sourceModule: "dossier",
        eventType: "document_added",
        eventData: { fileName: file.name, documentType },
        artifactType: "document",
        artifactId: (data as any).id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      invalidateDossier(qc, parcelId!);
      showChangeReceipt({
        entity: `Document: ${variables.file.name}`,
        action: "Document uploaded",
        impact: "parcel",
        reason: `Type: ${variables.documentType}`,
      });
    },
    onError: (err: any) => toast.error(err.message || "Upload failed"),
  });
}

export function useDeleteDocument(parcelId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: { id: string; file_path: string }) => {
      await supabase.storage.from("dossier-files").remove([doc.file_path]);
      const { error } = await supabase
        .from("dossier_documents")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDossier(qc, parcelId!);
      toast.success("Document deleted");
    },
    onError: (err: any) => toast.error(err.message || "Delete failed"),
  });
}

// ---- Narratives ----

export function useDossierNarratives(parcelId: string | null) {
  return useQuery({
    queryKey: ["dossier-narratives", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossier_narratives")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!parcelId,
  });
}

export function useSaveNarrative(parcelId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      title: string;
      content: string;
      narrativeType: string;
      aiGenerated: boolean;
      modelUsed?: string;
    }) => {
      if (!parcelId) throw new Error("No parcel selected");
      const { data, error } = await supabase
        .from("dossier_narratives")
        .insert({
          parcel_id: parcelId,
          title: params.title,
          content: params.content,
          narrative_type: params.narrativeType,
          ai_generated: params.aiGenerated,
          model_used: params.modelUsed || null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      emitTraceEventAsync({
        parcelId,
        sourceModule: "dossier",
        eventType: "evidence_attached",
        eventData: { narrativeType: params.narrativeType, title: params.title, aiGenerated: params.aiGenerated },
        artifactType: "narrative",
        artifactId: (data as any).id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      invalidateDossier(qc, parcelId!);
      showChangeReceipt({
        entity: `Narrative: ${variables.title}`,
        action: "Narrative saved",
        impact: "parcel",
        reason: variables.aiGenerated ? "AI-generated" : "Manual",
      });
    },
    onError: (err: any) => toast.error(err.message || "Failed to save narrative"),
  });
}

export function useDeleteNarrative(parcelId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("dossier_narratives")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDossier(qc, parcelId!);
      toast.success("Narrative deleted");
    },
    onError: (err: any) => toast.error(err.message || "Delete failed"),
  });
}

// ---- Packets ----

export function useDossierPackets(parcelId: string | null) {
  return useQuery({
    queryKey: ["dossier-packets", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossier_packets")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!parcelId,
  });
}

export function useAssemblePacket(parcelId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      title: string;
      packetType: string;
      documentIds: string[];
      narrativeIds: string[];
    }) => {
      if (!parcelId) throw new Error("No parcel selected");
      const { data, error } = await supabase
        .from("dossier_packets")
        .insert({
          parcel_id: parcelId,
          title: params.title,
          packet_type: params.packetType,
          document_ids: params.documentIds,
          narrative_ids: params.narrativeIds,
          status: "draft",
        } as any)
        .select()
        .single();
      if (error) throw error;

      emitTraceEventAsync({
        parcelId,
        sourceModule: "dossier",
        eventType: "evidence_attached",
        eventData: {
          packetType: params.packetType,
          documentCount: params.documentIds.length,
          narrativeCount: params.narrativeIds.length,
        },
        artifactType: "packet",
        artifactId: (data as any).id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      invalidateDossier(qc, parcelId!);
      showChangeReceipt({
        entity: `Packet: ${variables.title}`,
        action: "Evidence packet assembled",
        impact: "parcel",
        reason: `${variables.documentIds.length} docs, ${variables.narrativeIds.length} narratives`,
      });
    },
    onError: (err: any) => toast.error(err.message || "Failed to assemble packet"),
  });
}

export function useFinalizePacket(parcelId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (packetId: string) => {
      if (!parcelId) throw new Error("No parcel selected");
      const { data, error } = await supabase
        .from("dossier_packets")
        .update({
          status: "finalized",
          finalized_at: new Date().toISOString(),
        } as any)
        .eq("id", packetId)
        .select()
        .single();
      if (error) throw error;

      emitTraceEventAsync({
        parcelId,
        sourceModule: "dossier",
        eventType: "evidence_attached",
        eventData: { action: "packet_finalized", packetId },
        artifactType: "packet",
        artifactId: packetId,
      });

      return data;
    },
    onSuccess: () => {
      invalidateDossier(qc, parcelId!);
      showChangeReceipt({
        entity: "Evidence Packet",
        action: "Packet finalized",
        impact: "parcel",
        reason: "Ready for hearing / export",
      });
    },
    onError: (err: any) => toast.error(err.message || "Finalization failed"),
  });
}

export function usePacketContents(packet: any | null) {
  const docIds: string[] = packet?.document_ids || [];
  const narIds: string[] = packet?.narrative_ids || [];

  const docsQuery = useQuery({
    queryKey: ["packet-docs", packet?.id],
    queryFn: async () => {
      if (!docIds.length) return [];
      const { data, error } = await supabase
        .from("dossier_documents")
        .select("*")
        .in("id", docIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!packet && docIds.length > 0,
  });

  const narrativesQuery = useQuery({
    queryKey: ["packet-narratives", packet?.id],
    queryFn: async () => {
      if (!narIds.length) return [];
      const { data, error } = await supabase
        .from("dossier_narratives")
        .select("*")
        .in("id", narIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!packet && narIds.length > 0,
  });

  return {
    documents: docsQuery.data || [],
    narratives: narrativesQuery.data || [],
    isLoading: docsQuery.isLoading || narrativesQuery.isLoading,
  };
}
