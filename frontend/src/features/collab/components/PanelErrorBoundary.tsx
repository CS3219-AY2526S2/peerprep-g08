import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@heroui/react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Generic error boundary for isolating panel failures.
 * Each panel in the split view is wrapped individually so one
 * broken panel does not crash the entire room.
 */
export default class PanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PanelErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
          <span className="text-4xl">💥</span>
          <p className="text-sm font-semibold text-danger">
            {this.props.fallbackLabel ?? "Panel error"}
          </p>
          <p className="text-xs text-default-400 break-words max-w-xs">
            {this.state.message}
          </p>
          <Button size="sm" variant="flat" onPress={this.handleReset}>
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
