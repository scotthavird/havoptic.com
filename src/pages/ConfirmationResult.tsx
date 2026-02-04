import { useEffect, useState } from 'react';

type ConfirmationStatus = 'success' | 'already-confirmed' | 'invalid-token' | 'expired-token' | 'missing-token' | 'server-error' | 'loading';

function getStatusFromUrl(): ConfirmationStatus {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  const error = params.get('error');

  if (status === 'success') return 'success';
  if (status === 'already-confirmed') return 'already-confirmed';
  if (error === 'invalid-token') return 'invalid-token';
  if (error === 'expired-token') return 'expired-token';
  if (error === 'missing-token') return 'missing-token';
  if (error === 'server-error') return 'server-error';

  return 'loading';
}

export function ConfirmationResult() {
  const [status, setStatus] = useState<ConfirmationStatus>('loading');

  useEffect(() => {
    setStatus(getStatusFromUrl());
  }, []);

  const renderContent = () => {
    switch (status) {
      case 'success':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">You're In!</h1>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
              Your email has been confirmed. You'll now receive notifications when AI coding tools ship new releases.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
            >
              Explore the Timeline
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        );

      case 'already-confirmed':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Already Confirmed</h1>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
              Good news! Your email was already confirmed. You're all set to receive notifications.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Go to Timeline
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        );

      case 'expired-token':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Link Expired</h1>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
              This confirmation link has expired. Please subscribe again to receive a new confirmation email.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
            >
              Subscribe Again
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </a>
          </div>
        );

      case 'invalid-token':
      case 'missing-token':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Invalid Link</h1>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
              This confirmation link is invalid. Please check your email for the correct link, or subscribe again.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Go to Homepage
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        );

      case 'server-error':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Something Went Wrong</h1>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
              We couldn't verify your email due to a server error. Please try again later or contact support.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Go to Homepage
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-slate-500 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Processing...</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {renderContent()}
      </div>
    </div>
  );
}
