"use client";
import React from "react";
import { HiOutlineExclamationCircle } from "react-icons/hi";

type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center p-6">
          <div className="max-w-xl w-full text-center p-6 rounded-lg bg-card border border-red-600/20">
            <div className="flex items-center justify-center mb-3">
              <HiOutlineExclamationCircle className="text-red-500 text-3xl" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mb-4">An error occurred while loading this part of the app. You can retry or continue using other sections.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={this.reset} className="px-4 py-2 rounded bg-blue-600 text-white">Retry</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
