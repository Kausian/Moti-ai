"use client";

import type { LearnerLevel } from "@/lib/types";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import { Field, inputClass, inputInvalidClass } from "./formPrimitives";

const LEVELS: { value: LearnerLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function CourseSettingsForm() {
  const { configuration, formErrors, updateCourse } = useCourseConfiguration();

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Course title"
        htmlFor="field-course-title"
        required
        error={formErrors.courseTitle}
      >
        <input
          id="field-course-title"
          className={`${inputClass} ${formErrors.courseTitle ? inputInvalidClass : ""}`}
          value={configuration.courseTitle}
          aria-invalid={formErrors.courseTitle ? true : undefined}
          aria-describedby={
            formErrors.courseTitle ? "field-course-title-error" : undefined
          }
          onChange={(event) => updateCourse({ courseTitle: event.target.value })}
        />
      </Field>

      <Field label="Learner level" htmlFor="field-level">
        <select
          id="field-level"
          className={inputClass}
          value={configuration.learnerLevel}
          onChange={(event) =>
            updateCourse({ learnerLevel: event.target.value as LearnerLevel })
          }
        >
          {LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Learning objective"
        htmlFor="field-objective"
        required
        hint="What the learner should be able to do by the end."
        error={formErrors.learningObjective}
      >
        <textarea
          id="field-objective"
          rows={3}
          className={`${inputClass} resize-none ${formErrors.learningObjective ? inputInvalidClass : ""}`}
          value={configuration.learningObjective}
          aria-invalid={formErrors.learningObjective ? true : undefined}
          aria-describedby={
            formErrors.learningObjective ? "field-objective-error" : undefined
          }
          onChange={(event) =>
            updateCourse({ learningObjective: event.target.value })
          }
        />
      </Field>

      <Field
        label="Moti instructions"
        htmlFor="field-instructions"
        required
        hint="How Moti should coach — tone, and how much to guide vs. tell."
        error={formErrors.assistantInstructions}
      >
        <textarea
          id="field-instructions"
          rows={4}
          className={`${inputClass} resize-none ${formErrors.assistantInstructions ? inputInvalidClass : ""}`}
          value={configuration.assistantInstructions}
          aria-invalid={formErrors.assistantInstructions ? true : undefined}
          aria-describedby={
            formErrors.assistantInstructions
              ? "field-instructions-error"
              : undefined
          }
          onChange={(event) =>
            updateCourse({ assistantInstructions: event.target.value })
          }
        />
      </Field>
    </div>
  );
}
