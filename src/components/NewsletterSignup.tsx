import { useState } from 'react';

type SubscribeState = 'idle' | 'loading' | 'success' | 'error' | 'already_subscribed';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SubscribeState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('Please enter your email');
      setState('error');
      return;
    }

    setState('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Something went wrong');
        setState('error');
        return;
      }

      if (data.alreadySubscribed) {
        setState('already_subscribed');
      } else {
        setState('success');
        setEmail('');
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="text-center py-2">
        <p className="text-green-400 text-sm">Thanks for subscribing!</p>
      </div>
    );
  }

  if (state === 'already_subscribed') {
    return (
      <div className="text-center py-2">
        <p className="text-slate-400 text-sm">You're already subscribed!</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <p className="text-slate-400 text-sm mb-3 text-center">
        Get notified when your favorite AI tools ship new releases
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={state === 'loading'}
          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-claude focus:border-transparent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="px-4 py-2 bg-claude hover:bg-amber-600 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {state === 'error' && errorMessage && (
        <p className="text-red-400 text-xs mt-2 text-center">{errorMessage}</p>
      )}
    </div>
  );
}
