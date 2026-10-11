import { TriangleAlert } from 'lucide-react'
import { Component, type ReactNode } from 'react'
import { Notice } from './Notice'

/** Catches an unexpected error in the dashboard, so the page shows a message and never goes blank. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Aurora could not draw this view:', error)
  }

  render() {
    if (this.state.failed) {
      return (
        <Notice
          role="alert"
          icon={<TriangleAlert className="size-5" aria-hidden="true" />}
          title="This view could not be shown"
          action={{ label: 'Try again', onClick: () => this.setState({ failed: false }) }}
        >
          Something unexpected went wrong. Choose another city from the list on the left, or try again.
        </Notice>
      )
    }
    return this.props.children
  }
}
