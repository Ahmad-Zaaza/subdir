import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadForm } from "@/components/download-form";

function FolderIcon() {
  return (
    <svg
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3 7v13a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 007.93 4H5a2 2 0 00-2 2v1z" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl bg-gray-900/50 backdrop-blur-sm border-gray-800">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-fit p-3 rounded-xl bg-primary/10 text-primary">
            <FolderIcon />
          </div>
          <CardTitle className="text-2xl font-bold">Subdir</CardTitle>
          <CardDescription className="text-gray-400">
            Download any subdirectory from GitHub or GitLab as a ZIP file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DownloadForm />
        </CardContent>
      </Card>
    </main>
  );
}
