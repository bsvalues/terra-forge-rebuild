// TerraFusion OS — Phase 94: AxiomFS Real Storage Hook
// Connects AxiomFSDashboard to the dossier-files Supabase bucket

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { FileNode } from "@/components/axiomfs/AxiomFSDashboard";

const BUCKET = "dossier-files";
const QUERY_KEY = ["axiomfs-files"];

// ── File type detection ──────────────────────────────────────────
function inferType(name: string): FileNode["type"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "tiff"].includes(ext)) return "image";
  if (["pdf", "doc", "docx", "txt", "rtf"].includes(ext)) return "document";
  if (["json", "yaml", "yml", "toml", "env", "ini", "xml"].includes(ext)) return "config";
  if (["csv", "tsv", "geojson", "parquet", "xlsx", "xls", "pkl", "h5"].includes(ext)) return "data";
  return "document";
}

// ── Tags from path prefix ────────────────────────────────────────
function inferTags(path: string): string[] {
  const tags: string[] = [];
  if (path.startsWith("defense-packets/")) tags.push("defense-packets");
  if (path.startsWith("field-photos/")) tags.push("field-photos");
  if (path.startsWith("gis-exports/")) tags.push("gis");
  if (path.startsWith("models/")) tags.push("models");
  if (path.startsWith("reports/")) tags.push("reports");
  if (path.startsWith("config/")) tags.push("config");
  return tags;
}

// ── Transform StorageObject[] → FileNode[] ───────────────────────
interface StorageObject {
  id: string;
  name: string;
  metadata?: { size?: number; mimetype?: string };
  created_at?: string;
  updated_at?: string;
}

function buildFileTree(objects: StorageObject[], prefix: string): FileNode[] {
  const folders = new Map<string, FileNode>();
  const rootFiles: FileNode[] = [];

  for (const obj of objects) {
    const fullPath = prefix ? `${prefix}/${obj.name}` : obj.name;
    const parts = obj.name.split("/");

    if (parts.length > 1) {
      // File is inside a folder
      const folderName = parts[0];
      if (!folders.has(folderName)) {
        folders.set(folderName, {
          id: `folder-${folderName}`,
          name: folderName,
          type: "folder",
          size: 0,
          modified: new Date().toISOString().slice(0, 10),
          tags: inferTags(folderName + "/"),
          children: [],
        });
      }
      const folder = folders.get(folderName)!;
      const fileName = parts.slice(1).join("/");
      folder.children!.push({
        id: obj.id ?? `file-${fullPath}`,
        name: fileName,
        type: inferType(fileName),
        size: obj.metadata?.size ?? 0,
        modified: (obj.updated_at ?? obj.created_at ?? "").slice(0, 10),
        tags: inferTags(fullPath),
      });
      folder.size += obj.metadata?.size ?? 0;
    } else {
      rootFiles.push({
        id: obj.id ?? `file-${obj.name}`,
        name: obj.name,
        type: inferType(obj.name),
        size: obj.metadata?.size ?? 0,
        modified: (obj.updated_at ?? obj.created_at ?? "").slice(0, 10),
        tags: inferTags(obj.name),
      });
    }
  }

  return [...Array.from(folders.values()), ...rootFiles];
}

// ── List files ───────────────────────────────────────────────────
export function useAxiomFS() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<FileNode[]> => {
      const { data, error } = await supabase.storage.from(BUCKET).list("", {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;

      // For each folder, list its contents
      const folders = (data ?? []).filter((f) => !f.id || f.metadata?.mimetype === undefined);
      const files = (data ?? []).filter((f) => f.id && f.metadata?.mimetype !== undefined);

      const folderContents: StorageObject[] = [];
      for (const folder of folders) {
        const { data: children } = await supabase.storage.from(BUCKET).list(folder.name, {
          limit: 500,
          sortBy: { column: "name", order: "asc" },
        });
        if (children) {
          for (const child of children) {
            folderContents.push({
              ...child,
              name: `${folder.name}/${child.name}`,
            } as StorageObject);
          }
        }
      }

      return buildFileTree([...folderContents, ...files] as StorageObject[], "");
    },
    staleTime: 30_000,
  });
}

// ── Upload file ──────────────────────────────────────────────────
export function useAxiomUpload() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, path }: { file: File; path?: string }) => {
      const filePath = path ? `${path}/${file.name}` : file.name;
      const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      return filePath;
    },
    onSuccess: (filePath) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "File uploaded", description: filePath });
    },
    onError: (e: Error) => {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    },
  });
}

// ── Download file (signed URL) ───────────────────────────────────
export function useAxiomDownload() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (path: string) => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    onSuccess: (url) => {
      window.open(url, "_blank");
    },
    onError: (e: Error) => {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    },
  });
}

// ── Delete file (admin-only) ─────────────────────────────────────
export function useAxiomDelete() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (paths: string[]) => {
      const { error } = await supabase.storage.from(BUCKET).remove(paths);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "File deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });
}
