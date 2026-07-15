"use client";

import { useEffect, useRef, useState } from "react";
import type { DemoCourse, KnowledgeDocument } from "@/lib/types";
import {
  IconChevron,
  IconClose,
  IconSource,
  IconUpload,
} from "@/components/ui/icons";

export const SETTINGS_DRAWER_ID = "settings-drawer";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
type SettingsTab = "course" | "knowledge";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  course: DemoCourse;
  documents: KnowledgeDocument[];
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-moti-navy">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-moti-navy-soft">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-moti-line bg-white px-3 py-2 text-sm text-moti-navy placeholder:text-moti-navy-soft/70 focus:border-moti-navy/40 focus:outline-none";

export function SettingsDrawer({
  open,
  onClose,
  course,
  documents,
}: SettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("course");
  const [form, setForm] = useState({
    courseTitle: course.title,
    learnerLevel: course.learnerLevel,
    objective: course.objective,
    motiInstructions: course.motiInstructions,
    pasteContent: "",
  });
  const [docs, setDocs] = useState<KnowledgeDocument[]>(documents);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Close on Escape, lock body scroll, and manage focus while open.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  const updateField = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

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
              className="flex flex-col gap-4"
            >
              <Field label="Course title" htmlFor="field-course-title">
                <input
                  id="field-course-title"
                  className={inputClass}
                  value={form.courseTitle}
                  onChange={(event) => updateField("courseTitle", event.target.value)}
                />
              </Field>

              <Field label="Learner level" htmlFor="field-level">
                <select
                  id="field-level"
                  className={inputClass}
                  value={form.learnerLevel}
                  onChange={(event) => updateField("learnerLevel", event.target.value)}
                >
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Learning objective"
                htmlFor="field-objective"
                hint="What the learner should be able to do by the end."
              >
                <textarea
                  id="field-objective"
                  rows={3}
                  className={`${inputClass} resize-none`}
                  value={form.objective}
                  onChange={(event) => updateField("objective", event.target.value)}
                />
              </Field>

              <Field
                label="Moti instructions"
                htmlFor="field-instructions"
                hint="How Moti should coach — tone, and how much to guide vs. tell."
              >
                <textarea
                  id="field-instructions"
                  rows={4}
                  className={`${inputClass} resize-none`}
                  value={form.motiInstructions}
                  onChange={(event) =>
                    updateField("motiInstructions", event.target.value)
                  }
                />
              </Field>
            </div>
          ) : (
            <div
              role="tabpanel"
              id="settings-tabpanel-knowledge"
              aria-labelledby="settings-tab-knowledge"
              className="flex flex-col gap-4"
            >
              <div>
                <p className="mb-1.5 text-sm font-medium text-moti-navy">
                  Knowledge documents
                </p>
                <ul className="flex flex-col gap-1.5">
                  {docs.map((document) => (
                    <li
                      key={document.id}
                      className="flex items-center gap-2.5 rounded-lg border border-moti-line bg-white px-3 py-2"
                    >
                      <IconSource className="h-4 w-4 shrink-0 text-moti-navy-soft" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-moti-navy">
                          {document.name}
                        </p>
                        <p className="text-xs text-moti-navy-soft">
                          {document.kind} · {document.meta}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${document.name}`}
                        onClick={() =>
                          setDocs((current) =>
                            current.filter((item) => item.id !== document.id),
                          )
                        }
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
                      >
                        <IconClose className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                  {docs.length === 0 && (
                    <li className="rounded-lg border border-dashed border-moti-line px-3 py-2 text-xs text-moti-navy-soft">
                      No documents. Add material below.
                    </li>
                  )}
                </ul>
              </div>

              <Field
                label="Paste learning content"
                htmlFor="field-paste"
                hint="Paste text Moti should learn from."
              >
                <textarea
                  id="field-paste"
                  rows={4}
                  className={`${inputClass} resize-none`}
                  placeholder="Paste notes, an article, or course text…"
                  value={form.pasteContent}
                  onChange={(event) => updateField("pasteContent", event.target.value)}
                />
              </Field>

              <div>
                <p className="mb-1.5 text-sm font-medium text-moti-navy">
                  Upload documents
                </p>
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-moti-line bg-moti-navy/[0.02] px-4 py-6 text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-moti-navy/5 text-moti-navy-soft">
                    <IconUpload className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-medium text-moti-navy">
                    Drag and drop, or browse
                  </p>
                  <p className="text-xs text-moti-navy-soft">
                    Planned support for PDF, TXT and Markdown.
                  </p>
                  <button
                    type="button"
                    disabled
                    className="mt-1 cursor-not-allowed rounded-lg border border-moti-line px-3 py-1.5 text-sm font-medium text-moti-navy-soft opacity-60"
                  >
                    Browse files
                  </button>
                  <p className="text-[11px] text-moti-navy-soft">
                    File handling arrives in a later phase.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-moti-line px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-moti-line px-3 py-2 text-sm font-medium text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
            >
              <IconChevron className="h-4 w-4 rotate-90" />
              Reset sample course
            </button>
            <button
              type="button"
              className="ml-auto inline-flex items-center rounded-lg bg-moti-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-moti-navy/90 focus-visible:bg-moti-navy/90"
            >
              Save configuration
            </button>
          </div>
          <p className="mt-2 text-[11px] text-moti-navy-soft">
            Saving and reset are visual in this preview — no data is stored yet.
          </p>
        </div>
      </div>
    </div>
  );
}
