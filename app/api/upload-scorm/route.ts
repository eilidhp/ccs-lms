import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique, secure folder name
    const uniqueId = `scorm-${Date.now()}`;
    const extractPath = path.join(process.cwd(), "public", "scorm", uniqueId);
    
    // Ensure the folder exists on the server
    await mkdir(extractPath, { recursive: true });

    // Temporarily save the zip
    const tempZipPath = path.join(extractPath, "temp.zip");
    await writeFile(tempZipPath, buffer);

    // Unpack the zip file!
    const zip = new AdmZip(tempZipPath);
    zip.extractAllTo(extractPath, true);

    // 🧠 THE BLOODHOUND ALGORITHM
    const entries = zip.getEntries();
    let mainFile = ""; 
    
    // Ignore annoying hidden Mac folders that sometimes break the zip reading
    const validEntries = entries.filter(e => !e.entryName.includes("__MACOSX") && !e.entryName.startsWith("."));
    
    // Hunt deep inside sub-folders for the exact launch files
    const story = validEntries.find(e => e.entryName.toLowerCase().endsWith('story.html'));
    const indexApi = validEntries.find(e => e.entryName.toLowerCase().endsWith('scormdriver/indexapi.html'));
    const indexLms = validEntries.find(e => e.entryName.toLowerCase().endsWith('index_lms.html'));
    const indexHtml = validEntries.find(e => e.entryName.toLowerCase().endsWith('index.html'));
    const anyHtml = validEntries.find(e => e.entryName.toLowerCase().endsWith('.html'));

    // Choose the best match based on standard authoring tools
    const target = story || indexApi || indexLms || indexHtml || anyHtml;

    if (target) {
        // Convert any Windows backslashes to web forward slashes
        mainFile = target.entryName.replace(/\\/g, '/');
    } else {
        mainFile = "index.html"; // Safe fallback
    }

    // encodeURI ensures spaces in folder/file names don't break the web link!
    const url = encodeURI(`/scorm/${uniqueId}/${mainFile}`);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("SCORM Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}