"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileUp, LoaderCircle, NotebookPen, Pencil, Search, Trash2, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogPortal, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getMaterialUploadKind,
  MATERIAL_UPLOAD_ACCEPT,
  toMaterialSummary,
  type MaterialGeneration,
  type MaterialSuggestedSection,
  type ProjectMaterial,
  type ProjectMaterialSummary,
} from "@/lib/project-material";
import type { ResumeVersionView } from "@/components/app/types";

const sectionLabels: Record<MaterialSuggestedSection, "materials.sections.projects" | "materials.sections.experiences" | "materials.sections.internships"> = {
  projects: "materials.sections.projects",
  experiences: "materials.sections.experiences",
  internships: "materials.sections.internships",
};

export function MaterialsWorkspace({ resumeVersions, onApplyToResume }: {
  resumeVersions: ResumeVersionView[];
  onApplyToResume: (input: { versionId: string | null; generation: MaterialGeneration }) => void;
}) {
  return <Suspense fallback={null}><MaterialsRoute resumeVersions={resumeVersions} onApplyToResume={onApplyToResume} /></Suspense>;
}

function MaterialsRoute({ resumeVersions, onApplyToResume }: {
  resumeVersions: ResumeVersionView[];
  onApplyToResume: (input: { versionId: string | null; generation: MaterialGeneration }) => void;
}) {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");
  return <MaterialsCatalog key={initialId} initialSelectedId={initialId} resumeVersions={resumeVersions} onApplyToResume={onApplyToResume} />;
}

type DraftFailure = { key: string };

function MaterialsCatalog({ initialSelectedId, resumeVersions, onApplyToResume }: {
  initialSelectedId: string | null;
  resumeVersions: ResumeVersionView[];
  onApplyToResume: (input: { versionId: string | null; generation: MaterialGeneration }) => void;
}) {
  const t = useTranslations("materials");
  const [materials, setMaterials] = useState<ProjectMaterialSummary[] | null>(null);
  const [failure, setFailure] = useState<DraftFailure | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProjectMaterial | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [draftTarget, setDraftTarget] = useState<{ generation: MaterialGeneration } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const response = await fetch("/api/materials", { cache: "no-store" });
    if (!response.ok) throw new Error("load failed");
    const data = (await response.json()) as { materials: ProjectMaterial[] };
    setMaterials(data.materials.map(toMaterialSummary));
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/materials", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load failed");
        const data = (await response.json()) as { materials: ProjectMaterial[] };
        if (!cancelled) setMaterials(data.materials.map(toMaterialSummary));
      })
      .catch(() => {
        if (!cancelled) setFailure({ key: "list" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialSelectedId || !materials) return;
    if (selected) return;
    openMaterial(initialSelectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedId, materials]);

  async function openMaterial(id: string) {
    const response = await fetch(`/api/materials/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { material: ProjectMaterial };
    setSelected(data.material);
  }

  async function handleUpload(file: File) {
    if (getMaterialUploadKind(file.name) === null) {
      setUploadMessage(t("upload.unsupported"));
      return;
    }
    setIsUploading(true);
    setUploadMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/materials", { method: "POST", body });
      const data = (await response.json()) as { material?: ProjectMaterial; error?: string };
      if (!response.ok || !data.material) throw new Error(data.error || "upload failed");
      setUploadMessage(t("upload.imported", { name: data.material.name, count: data.material.charCount }));
      await refresh();
    } catch (error) {
      setUploadMessage(error instanceof Error && error.message ? error.message : t("upload.failed"));
    } finally {
      setIsUploading(false);
    }
  }

  const filtered = useMemo(() => {
    const items = materials ?? [];
    const keyword = query.trim().toLocaleLowerCase();
    if (!keyword) return items;
    return items.filter((item) => `${item.name} ${item.sourceFileName}`.toLocaleLowerCase().includes(keyword));
  }, [materials, query]);

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search aria-hidden className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={t("search")} placeholder={t("searchPlaceholder")} maxLength={120} value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 rounded-xl pl-12 pr-10" />
          {query ? <Button variant="ghost" size="icon" aria-label={t("clearSearch")} onClick={() => setQuery("")} className="absolute right-2 top-1.5"><X aria-hidden /></Button> : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={MATERIAL_UPLOAD_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
            event.target.value = "";
          }}
        />
        <Button type="button" size="lg" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
          {isUploading ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <FileUp data-icon="inline-start" />}
          {isUploading ? t("upload.uploading") : t("upload.button")}
        </Button>
      </div>
      <p role="status" className={cn("text-sm", uploadMessage ? "text-muted-foreground" : "sr-only")}>{uploadMessage || t("upload.formats")}</p>

      {!materials && !failure ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" aria-hidden />{t("loading")}</div>
      ) : failure ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">{t("loadFailed")}</div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
          <NotebookPen aria-hidden className="mb-4 size-8 text-muted-foreground/60" />
          <h2 className="font-medium">{materials?.length ? t("noResults") : t("empty.title")}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{materials?.length ? t("noResultsHint") : t("empty.hint")}</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((material) => (
            <li key={material.id} className="rounded-2xl border border-line p-4 transition-colors hover:bg-surface-low/50">
              <div className="flex items-start justify-between gap-3">
                <button type="button" className="text-left outline-none focus-visible:underline" onClick={() => void openMaterial(material.id)}>
                  <span className="font-semibold leading-6">{material.name}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{t("sourceLine", { file: material.sourceFileName || "—", count: material.charCount })}</p>
                </button>
                {material.generations.length ? <Badge variant="secondary">{t("draftCount", { count: material.generations.length })}</Badge> : null}
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{material.preview}</p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs tabular-nums text-muted-foreground">{material.updatedAt.slice(0, 10)}</span>
                <Button variant="ghost" size="sm" onClick={() => void openMaterial(material.id)}>{t("details")}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MaterialDetailDialog
        key={selected?.id ?? "no-material"}
        material={selected}
        onClose={() => setSelected(null)}
        onSaved={async (next) => {
          setSelected(next);
          await refresh().catch(() => undefined);
        }}
        onDeleted={async () => {
          setSelected(null);
          await refresh().catch(() => undefined);
        }}
        onDraftApplied={(generation) => {
          setDraftTarget({ generation });
        }}
      />

      <Dialog modal={false} open={Boolean(draftTarget)} onOpenChange={(open) => { if (!open) setDraftTarget(null); }}>
        <DialogPortal>
          <DialogPrimitive.Popup className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col gap-5 overflow-y-auto border-l bg-background p-5 shadow-xl outline-none sm:w-[clamp(320px,30vw,520px)]">
            {draftTarget ? (
              <>
                <DialogHeader className="sticky -top-5 z-10 -mx-5 -mt-5 border-b bg-background p-5 pr-12">
                  <DialogTitle className="font-serif text-xl leading-7">{t("apply.title")}</DialogTitle>
                  <DialogDescription>{t("apply.description")}</DialogDescription>
                  <DialogClose render={<Button variant="ghost" size="icon" aria-label={t("apply.close")} className="absolute right-3 top-4" />}><X aria-hidden /></DialogClose>
                </DialogHeader>
                <GenerationDetail generation={draftTarget.generation} />
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{t("apply.targetResume")}</legend>
                  <div className="space-y-1.5">
                    {resumeVersions.slice(0, 12).map((version) => (
                      <button
                        key={version.id}
                        type="button"
                        className={buttonVariants({ variant: "outline", className: "h-auto w-full justify-start gap-2 py-2 text-left" })}
                        onClick={() => {
                          onApplyToResume({ versionId: version.id, generation: draftTarget.generation });
                          setDraftTarget(null);
                          setSelected(null);
                        }}
                      >
                        <Pencil aria-hidden className="size-4 shrink-0" />
                        <span className="truncate">{version.name}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <p className="text-xs leading-6 text-muted-foreground">{t("apply.editorHint")}</p>
              </>
            ) : null}
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </section>
  );
}

function GenerationDetail({ generation }: { generation: MaterialGeneration }) {
  const t = useTranslations("materials");
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-xs text-muted-foreground">{t("draft.section")}</p>
        <p className="mt-1 font-medium">{t(sectionLabels[generation.suggestedSection])}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{t("draft.title")}</p>
        <p className="mt-1 font-medium">{generation.item.title}{generation.item.subtitle ? ` · ${generation.item.subtitle}` : ""}{generation.item.period ? `（${generation.item.period}）` : ""}</p>
      </div>
      {generation.item.highlights.length ? (
        <div>
          <p className="text-xs text-muted-foreground">{t("draft.highlights")}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 leading-6">
            {generation.item.highlights.map((highlight, index) => <li key={index}>{highlight}</li>)}
          </ul>
        </div>
      ) : null}
      {generation.missing.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
          <p className="font-medium">{t("draft.missingTitle")}</p>
          <ul className="mt-1 list-disc pl-4">
            {generation.missing.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MaterialDetailDialog({ material, onClose, onSaved, onDeleted, onDraftApplied }: {
  material: ProjectMaterial | null;
  onClose: () => void;
  onSaved: (material: ProjectMaterial) => Promise<void>;
  onDeleted: () => Promise<void>;
  onDraftApplied: (generation: MaterialGeneration) => void;
}) {
  const t = useTranslations("materials");
  const [name, setName] = useState(material?.name ?? "");
  const [content, setContent] = useState(material?.content ?? "");
  const [targetRole, setTargetRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (!material) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/materials/${encodeURIComponent(material.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || material.name, content: content.trim() || material.content }),
      });
      const data = (await response.json()) as { material?: ProjectMaterial; error?: string };
      if (!response.ok || !data.material) throw new Error(data.error);
      setMessage(t("detail.saved"));
      await onSaved(data.material);
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : t("detail.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function generateDraft() {
    if (!material) return;
    setGenerating(true);
    setMessage("");
    try {
      const response = await fetch(`/api/materials/${encodeURIComponent(material.id)}/generations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetRole }),
      });
      const data = (await response.json()) as { material?: ProjectMaterial; generation?: MaterialGeneration; error?: string };
      if (!response.ok || !data.material) throw new Error(data.error);
      setName(data.material.name);
      setContent(data.material.content);
      setMessage(t("detail.generated"));
      await onSaved(data.material);
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : t("detail.generateFailed"));
    } finally {
      setGenerating(false);
    }
  }

  async function removeGeneration(generationId: string) {
    if (!material) return;
    const response = await fetch(`/api/materials/${encodeURIComponent(material.id)}?generationId=${encodeURIComponent(generationId)}`, { method: "DELETE" });
    if (!response.ok) return;
    const data = (await response.json()) as { material: ProjectMaterial };
    await onSaved(data.material);
  }

  async function removeMaterial() {
    if (!material) return;
    if (!window.confirm(t("detail.deleteConfirm", { name: material.name }))) return;
    const response = await fetch(`/api/materials/${encodeURIComponent(material.id)}`, { method: "DELETE" });
    if (!response.ok) return;
    await onDeleted();
  }

  return (
    <Dialog modal={false} open={Boolean(material)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPortal>
        <DialogPrimitive.Popup className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col gap-5 overflow-y-auto border-l bg-background p-5 shadow-xl outline-none sm:w-[clamp(360px,34vw,560px)]">
          {material ? (
            <>
              <DialogHeader className="sticky -top-5 z-10 -mx-5 -mt-5 border-b bg-background p-5 pr-12">
                <DialogTitle className="font-serif text-xl leading-7">{material.name}</DialogTitle>
                <DialogDescription>{t("sourceLine", { file: material.sourceFileName || "—", count: material.charCount })}</DialogDescription>
                <DialogClose render={<Button variant="ghost" size="icon" aria-label={t("detail.close")} className="absolute right-3 top-4" />}><X aria-hidden /></DialogClose>
              </DialogHeader>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="material-name">{t("detail.name")}</label>
                <Input id="material-name" value={name} maxLength={200} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="material-content">{t("detail.content")}</label>
                <Textarea id="material-content" value={content} rows={12} className="min-h-56 font-mono text-xs leading-5" onChange={(event) => setContent(event.target.value)} />
                <p className="text-xs text-muted-foreground">{t("detail.contentHint")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={saving || generating || (name === material.name && content === material.content)} onClick={() => void save()}>
                  {saving ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : null}
                  {t("detail.save")}
                </Button>
                <Button variant="ghost" className="text-destructive" onClick={() => void removeMaterial()}>{t("detail.delete")}</Button>
              </div>

              <section className="space-y-3 border-t border-line pt-4">
                <h2 className="font-semibold">{t("draft.title2")}</h2>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={targetRole} maxLength={500} placeholder={t("draft.targetRolePlaceholder")} onChange={(event) => setTargetRole(event.target.value)} />
                  <Button disabled={generating} onClick={() => void generateDraft()} className="shrink-0">
                    {generating ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : null}
                    {t("draft.generate")}
                  </Button>
                </div>
                {material.generations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("draft.empty")}</p>
                ) : (
                  <ul className="space-y-2">
                    {material.generations.map((generation) => (
                      <li key={generation.id} className="rounded-xl border border-line p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{generation.item.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{t(sectionLabels[generation.suggestedSection])} · {generation.createdAt.slice(0, 16).replace("T", " ")}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button variant="outline" size="sm" onClick={() => onDraftApplied(generation)}>{t("draft.apply")}</Button>
                            <Button variant="ghost" size="icon" aria-label={t("draft.delete")} onClick={() => void removeGeneration(generation.id)}><Trash2 aria-hidden className="size-4" /></Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <p role="status" className={cn("text-sm", message ? "text-muted-foreground" : "sr-only")}>{message}</p>
              <p className="text-xs leading-6 text-muted-foreground">{t("privacyNote")}</p>
            </>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
