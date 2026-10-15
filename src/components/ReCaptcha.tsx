'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark';
          size?: 'normal' | 'compact';
        }
      ) => number;
      reset: (opt_widget_id?: number) => void;
      getResponse: (opt_widget_id?: number) => string;
    };
    onRecaptchaLoaded?: () => void;
  }
}

export interface ReCaptchaRef {
  reset: () => void;
  getResponse: () => string;
}

interface ReCaptchaProps {
  siteKey?: string;
  onChange: (token: string | null) => void;
  onExpired?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
  className?: string;
}

const SCRIPT_ID = 'google-recaptcha-v2-script';

export const ReCaptcha = forwardRef<ReCaptchaRef, ReCaptchaProps>(
  (
    {
      siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
      onChange,
      onExpired,
      onError,
      theme = 'light',
      size = 'normal',
      className = '',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [scriptError, setScriptError] = useState(false);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (typeof window !== 'undefined' && window.grecaptcha && widgetIdRef.current !== null) {
          try {
            window.grecaptcha.reset(widgetIdRef.current);
          } catch (e) {
            console.warn('reCAPTCHA reset warning:', e);
          }
          onChange(null);
        }
      },
      getResponse: () => {
        if (typeof window !== 'undefined' && window.grecaptcha && widgetIdRef.current !== null) {
          return window.grecaptcha.getResponse(widgetIdRef.current);
        }
        return '';
      },
    }));

    useEffect(() => {
      if (!siteKey) {
        console.warn('ReCaptcha: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not defined.');
        return;
      }

      let isMounted = true;

      const renderWidget = () => {
        if (!isMounted || !containerRef.current || !window.grecaptcha) return;

        // Clean any existing rendered children inside container
        containerRef.current.innerHTML = '';

        try {
          const id = window.grecaptcha.render(containerRef.current, {
            sitekey: siteKey,
            theme,
            size,
            callback: (token: string) => {
              if (isMounted) onChange(token);
            },
            'expired-callback': () => {
              if (isMounted) {
                onChange(null);
                onExpired?.();
              }
            },
            'error-callback': () => {
              if (isMounted) {
                onChange(null);
                onError?.();
              }
            },
          });
          widgetIdRef.current = id;
          setIsLoaded(true);
        } catch (err) {
          console.error('Failed to render reCAPTCHA:', err);
        }
      };

      let checkInterval: NodeJS.Timeout | null = null;

      const loadScript = () => {
        if (typeof window !== 'undefined' && 'grecaptcha' in window && window.grecaptcha) {
          window.grecaptcha.ready(renderWidget);
          return;
        }

        let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
        if (!script) {
          script = document.createElement('script');
          script.id = SCRIPT_ID;
          script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
          script.async = true;
          script.defer = true;
          script.onerror = () => {
            if (isMounted) setScriptError(true);
          };
          document.head.appendChild(script);
        }

        checkInterval = setInterval(() => {
          if (typeof window !== 'undefined' && 'grecaptcha' in window && window.grecaptcha) {
            if (checkInterval) clearInterval(checkInterval);
            window.grecaptcha.ready(renderWidget);
          }
        }, 100);
      };

      loadScript();

      return () => {
        isMounted = false;
        if (checkInterval) clearInterval(checkInterval);
        if (typeof window !== 'undefined' && window.grecaptcha && widgetIdRef.current !== null) {
          try {
            window.grecaptcha.reset(widgetIdRef.current);
          } catch {
            // ignore cleanup errors
          }
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, theme, size]);

    return (
      <div className={`flex flex-col items-center justify-center w-full ${className}`}>
        {scriptError && (
          <div className="text-xs text-rose-500 font-semibold p-2.5 bg-rose-50 border border-rose-200 rounded-xl mb-2 text-center w-full max-w-[304px]">
            Failed to load Google reCAPTCHA. Please check your internet connection or ad-blocker.
          </div>
        )}
        <div
          ref={containerRef}
          className="min-h-[78px] min-w-[304px] flex items-center justify-center rounded-lg"
        />
      </div>
    );
  }
);

ReCaptcha.displayName = 'ReCaptcha';
