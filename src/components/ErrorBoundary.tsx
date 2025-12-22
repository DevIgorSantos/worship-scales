import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full border border-red-200">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Algo deu errado.</h1>
                        <p className="text-gray-700 mb-4">Ocorreu um erro inesperado na aplicação.</p>
                        {this.state.error && (
                            <pre className="bg-gray-100 p-4 rounded text-sm text-red-800 overflow-auto max-h-60">
                                {this.state.error.toString()}
                            </pre>
                        )}
                        <button
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                            onClick={() => window.location.reload()}
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
