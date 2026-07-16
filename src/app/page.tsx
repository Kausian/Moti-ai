import { CourseConfigurationProvider } from "@/contexts/CourseConfigurationContext";
import { LearningWorkspace } from "@/components/layout/LearningWorkspace";

export default function Home() {
  return (
    <CourseConfigurationProvider>
      <LearningWorkspace />
    </CourseConfigurationProvider>
  );
}
