import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Captcha token is required' },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY is not defined in environment variables');
      return NextResponse.json(
        { success: false, message: 'Server configuration error for reCAPTCHA' },
        { status: 500 }
      );
    }

    // Verify token with Google's siteverify endpoint
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ success: true, challenge_ts: data.challenge_ts, hostname: data.hostname });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'reCAPTCHA verification failed',
          errorCodes: data['error-codes'] || [],
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error during reCAPTCHA verification:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal server error during verification' },
      { status: 500 }
    );
  }
}
