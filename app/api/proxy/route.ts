import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://amapi.amfoss.in';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }

    // Build query string from all params except 'endpoint'
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        params.append(key, value);
      }
    });

    const url = `${API_BASE}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Try to parse as JSON, fallback to text if it fails
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType?.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        const text = await response.text();
        data = { error: text };
      }
    } else {
      const text = await response.text();
      // If response is not OK and not JSON, treat as error
      if (!response.ok) {
        data = { error: text, status: response.status };
      } else {
        // Try to parse anyway for backward compatibility
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text };
        }
      }
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from API' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }

    const body = await request.json();
    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Try to parse as JSON, fallback to text if it fails
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType?.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        const text = await response.text();
        data = { error: text };
      }
    } else {
      const text = await response.text();
      if (!response.ok) {
        data = { error: text, status: response.status };
      } else {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text };
        }
      }
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from API' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }

    const body = await request.json();
    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Try to parse as JSON, fallback to text if it fails
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType?.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        const text = await response.text();
        data = { error: text };
      }
    } else {
      const text = await response.text();
      if (!response.ok) {
        data = { error: text, status: response.status };
      } else {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text };
        }
      }
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from API' },
      { status: 500 }
    );
  }
}
