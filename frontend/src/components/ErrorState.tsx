function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 font-medium underline underline-offset-2 hover:no-underline"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export default ErrorState
