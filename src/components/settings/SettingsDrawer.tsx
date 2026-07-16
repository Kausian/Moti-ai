"use client";

import { useEffect, useRef, useState } from "react";
import type { KnowledgeDocument } from "@/lib/types";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import {
  IconAlert,
  IconCheckCircle,
  IconClose,
  IconInfo,
  IconReset,
} from "@/components/ui/icons";
import { CourseSettingsForm } from "./CourseSettingsForm";
import { KnowledgeDocumentList } from "./KnowledgeDocumentList";
import { KnowledgeUploader } from "./KnowledgeUploader";
import { PasteKnowledgeForm } from "./PasteKnowledgeForm";
import { DocumentPreviewDialog } from "./DocumentPreviewDialog";

export const SETTINGS_DRAWER_ID = "settings-drawer";

type SettingsTab = "course" | "knowledge";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

function SaveStatusMessage() {
  const { hydrated, isDirty, saveState } = useCourseConfiguration();

  let icon = <IconInfo className="h-4 w-4 text-moti-navy-soft" />;
  let text = "Saved to this browser";
  let tone = "text-moti-navy-soft";

  if (!hydrated) {
    text = "Loading saved configuration…";
  } else if (saveState.status === "error") {
    icon = <IconAlert className="h-4 w-4 text-moti-danger" />;
    text = saveState.message ?? "Couldn't save.";
    tone = "text-moti-danger";
  } else if (saveState.status === "saved") {
    icon = <IconCheckCircle className="h-4 w-4 text-moti-understood" />;
    text = saveState.message ?? "Saved locally.";
    tone = "text-moti-understood";
  } else if (isDirty) {
    icon = (
      <span
        aria-hidden
        className="block h-2.5 w-2.5 rounded-full bg-moti-exploring"
      />
    );
    text = "Unsaved changes";
    tone = "text-moti-exploring";
  }

  return (
    <p
      aria-live="polite"
      className={`flex items-center gap-1.5 text-xs font-medium ${tone}`}
    >
      {icon}
      {text}
    </p>
  );
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const { courseIsValid, resetSampleCourse, saveConfiguration } =
    useCourseConfiguration();
  const [activeTab, setActiveTab] = useState<SettingsTab>("course");
  const [previewDocument, setPreviewDocument] =
    useState<KnowledgeDocument | null>(null);
  const [resetConfirming, setResetConfirming] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const previewOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Keep refs in sync via effects (not during render) so the open effect below
  // can depend only on `open`. This is essential: `onClose` is recreated on
  // every parent render (which happens on any configuration change), and a
  // dependency on it would re-run the focus/scroll effect on every keystroke.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previewOpenRef.current = previewDocument !== null;
  }, [previewDocument]);

  const handleSave = () => {
    // Show the Course tab first if required fields are missing, so the inline
    // validation errors are visible when they appear.
    if (!courseIsValid) setActiveTab("course");
    saveConfiguration();
  };

  // Escape / scroll-lock / focus management. Runs only when `open` toggles.
  // Escape is ignored while the preview dialog is open so it closes first.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !previewOpenRef.current) onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={open ? undefined : true}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-moti-navy/30 backdrop-blur-[1px] transition-opacity duration-300 motion-reduce:transition-none ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        id={SETTINGS_DRAWER_ID}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        inert={!open}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-moti-line px-4 py-3">
          <div>
            <h2 id="settings-title" className="text-base font-semibold text-moti-navy">
              Knowledge &amp; settings
            </h2>
            <p className="text-xs text-moti-navy-soft">
              Configure Moti and the learning material
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="grid h-9 w-9 place-items-center rounded-lg text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 border-b border-moti-line px-3 py-2"
        >
          {(
            [
              { id: "course", label: "Course & Coach" },
              { id: "knowledge", label: "Knowledge" },
            ] as const
          ).map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`settings-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`settings-tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? "bg-moti-navy text-white"
                    : "text-moti-navy-soft hover:bg-moti-navy/5"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {activeTab === "course" ? (
            <div
              role="tabpanel"
              id="settings-tabpanel-course"
              aria-labelledby="settings-tab-course"
            >
              <CourseSettingsForm />
            </div>
          ) : (
            <div
              role="tabpanel"
              id="settings-tabpanel-knowledge"
              aria-labelledby="settings-tab-knowledge"
              className="flex flex-col gap-5"
            >
              <p className="flex items-start gap-2 rounded-lg border border-moti-line bg-moti-navy/[0.03] px-3 py-2 text-xs leading-5 text-moti-navy-soft">
                <IconInfo className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Documents are processed in your browser for this prototype.
                  Saved configuration stays in this browser profile on this
                  device — nothing is uploaded.
                </span>
              </p>
              <KnowledgeDocumentList onPreview={setPreviewDocument} />
              <PasteKnowledgeForm />
              <KnowledgeUploader />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-moti-line px-4 py-3">
          {resetConfirming ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-moti-danger-bg px-3 py-2">
              <p className="mr-auto text-xs font-medium text-moti-danger">
                Reset to the sample course? Uploaded and pasted documents will be
                removed.
              </p>
              <button
                type="button"
                onClick={() => setResetConfirming(false)}
                className="rounded-md border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy-soft transition-colors hover:bg-moti-navy/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetSampleCourse();
                  setResetConfirming(false);
                }}
                className="rounded-md bg-moti-danger px-2.5 py-1 text-xs font-medium text-white transition-colors hover:opacity-90"
              >
                Reset
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setResetConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-moti-line px-3 py-2 text-sm font-medium text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
              >
                <IconReset className="h-4 w-4" />
                Reset sample course
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="ml-auto inline-flex items-center rounded-lg bg-moti-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-moti-navy/90 focus-visible:bg-moti-navy/90"
              >
                Save configuration
              </button>
            </div>
          )}
          <div className="mt-2">
            <SaveStatusMessage />
          </div>
        </div>
      </div>

      <DocumentPreviewDialog
        doc={previewDocument}
        onClose={() => setPreviewDocument(null)}
      />
    </div>
  );
}
