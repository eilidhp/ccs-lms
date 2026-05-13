import { NextResponse } from 'next/server';

export async function GET(request: Request, context: any) {
  // Await params safely
  const params = await Promise.resolve(context.params);
  const pathArray = params.path || [];
  const filePath = pathArray.map(encodeURIComponent).join('/');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const targetUrl = `${supabaseUrl}/storage/v1/object/public/course-content/${filePath}`;

  const ext = pathArray[pathArray.length - 1]?.split('.').pop()?.toLowerCase() || '';
  
  // Heavy media bypasses the proxy via redirect to save Vercel server bandwidth
  const isHeavyMedia = ['mp4', 'mp3', 'wav', 'webm', 'avi', 'zip', 'pdf'].includes(ext);

  if (isHeavyMedia) {
    return NextResponse.redirect(targetUrl);
  }

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) return new NextResponse("File not found", { status: 404 });

    let contentType = 'text/plain';
    if (ext === 'html' || ext === 'htm') contentType = 'text/html; charset=utf-8';
    else if (ext === 'css') contentType = 'text/css; charset=utf-8';
    else if (ext === 'js') contentType = 'application/javascript; charset=utf-8';
    else if (ext === 'json') contentType = 'application/json; charset=utf-8';
    else if (ext === 'svg') contentType = 'image/svg+xml';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'woff2') contentType = 'font/woff2';
    else if (ext === 'woff') contentType = 'font/woff';
    else if (ext === 'ttf') contentType = 'font/ttf';
    else contentType = 'application/octet-stream';

    // Stream the file directly to the browser with the CORRECT web page tags
    return new NextResponse(res.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}