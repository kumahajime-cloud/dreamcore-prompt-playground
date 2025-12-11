'use client';

interface GamePreviewProps {
  html: string;
  title: string;
}

export default function GamePreview({ html, title }: GamePreviewProps) {
  if (!html) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">ゲームがまだ生成されていません</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            AIにゲーム作成を依頼してください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {title || 'Game Preview'}
        </h3>
      </div>
      <div className="flex-1 relative">
        <iframe
          key={html}
          title="Game Preview"
          srcDoc={html}
          className="absolute inset-0 w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
        />
      </div>
    </div>
  );
}
