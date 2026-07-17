"use client";

import { Component, type ReactNode } from "react";

interface MotiAvatarErrorBoundaryProps {
  /** Rendered instead of the children if the 3D scene throws. */
  fallback: ReactNode;
  children: ReactNode;
}

interface MotiAvatarErrorBoundaryState {
  hasError: boolean;
}

// A focused error boundary around the WebGL scene only. If the 3D scene throws
// (context creation failure, a runtime error while loading, a device that cannot
// render it), it swaps in the on-brand 2D fallback. It never surfaces a raw
// WebGL or stack-trace message, and the surrounding conversation and learning
// workspace keep working. This boundary is dedicated to the avatar and exposes
// no technical internals.
export class MotiAvatarErrorBoundary extends Component<
  MotiAvatarErrorBoundaryProps,
  MotiAvatarErrorBoundaryState
> {
  state: MotiAvatarErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MotiAvatarErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
