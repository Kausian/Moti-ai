import { CourseConfigurationProvider } from "@/contexts/CourseConfigurationContext";
import { LearningProgressProvider } from "@/contexts/LearningProgressContext";
import { LearningWorkspace } from "@/components/layout/LearningWorkspace";

export default function Home() {
  return (
    <CourseConfigurationProvider>
      {/* Progress is scoped by the configured courseId, so it nests inside. */}
      <LearningProgressProvider>
        <LearningWorkspace />
      </LearningProgressProvider>
    </CourseConfigurationProvider>
  );
}
