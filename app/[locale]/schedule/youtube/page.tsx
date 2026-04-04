"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";

/* ------------------------------------------------------------------ */
/*  YouTube Upload Form                                               */
/* ------------------------------------------------------------------ */

interface GalleryVideo {
  id: string;
  type: "video";
  blobUrl: string;
  prompt: string;
  createdAt: string;
  isPublic: boolean;
  user?: {
    name: string | null;
    picture: string | null;
  };
}

function YouTubeUploadForm({
  accounts,
  selectedAccountId,
  setSelectedAccountId,
}: {
  accounts: { id: string; label: string | null; username: string | null; isDefault: boolean }[];
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("schedule");
  const locale = useLocale();
  const prefix = locale === "zh" ? "/zh" : "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">("public");
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Video source: "upload" | "myItems" | "community"
  const [videoSource, setVideoSource] = useState<"upload" | "myItems" | "community">("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedGalleryVideo, setSelectedGalleryVideo] = useState<string | null>(null);
  const [galleryVideos, setGalleryVideos] = useState<GalleryVideo[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  useEffect(() => {
    const prefillTitle = searchParams.get("title");
    if (prefillTitle) setTitle(prefillTitle);
    const prefillAccount = searchParams.get("youtubeAccountId");
    if (prefillAccount) setSelectedAccountId(prefillAccount);
  }, [searchParams, setSelectedAccountId]);

  // Load gallery videos when switching to myItems or community
  useEffect(() => {
    if (videoSource === "myItems" || videoSource === "community") {
      loadGalleryVideos();
    }
  }, [videoSource]);

  const loadGalleryVideos = async () => {
    setLoadingGallery(true);
    try {
      const endpoint = videoSource === "myItems" ? "/api/gallery?tab=mine&type=video" : "/api/gallery?tab=public&type=video";
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setGalleryVideos(data.items || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingGallery(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setUploadedFile(file);
      setSelectedGalleryVideo(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError(t("errorContent"));
      return;
    }

    if (videoSource === "upload" && !uploadedFile) {
      setError(t("youtubeNoVideos"));
      return;
    }

    if ((videoSource === "myItems" || videoSource === "community") && !selectedGalleryVideo) {
      setError(t("youtubeSelectVideo"));
      return;
    }

    if (scheduleType === "later" && (!scheduledDate || !scheduledTime)) {
      setError(t("errorDateTime"));
      return;
    }

    if (!selectedAccountId) {
      setError(t("errorAccount"));
      return;
    }

    setIsSubmitting(true);
    try {
      let videoUrl = null;

      // Handle file upload
      if (videoSource === "upload" && uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const uploadRes = await fetch("/api/toolbox/upload-video", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || "Failed to upload video");
        }

        const uploadData = await uploadRes.json();
        videoUrl = uploadData.url;
      } else if (selectedGalleryVideo) {
        videoUrl = selectedGalleryVideo;
      }

      let scheduledAt = null;
      if (scheduleType === "later") {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      const res = await fetch("/api/youtube/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          visibility,
          videoUrl,
          postImmediately: scheduleType === "now",
          scheduledAt,
          youtubeAccountId: selectedAccountId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create YouTube post");
      }

      // Show success message
      const message = scheduleType === "now" 
        ? (t("youtubeUploadSuccess") || "Video uploaded successfully!")
        : (t("youtubeScheduleSuccess") || "Video scheduled successfully!");
      setSuccessMessage(message);
      
      // Reset form
      setTitle("");
      setDescription("");
      setVisibility("public");
      setScheduleType("now");
      setScheduledDate("");
      setScheduledTime("");
      setUploadedFile(null);
      setSelectedGalleryVideo(null);
      setUploadProgress(0);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000);
      
      // Optionally reload gallery if user was using it
      if (videoSource === "myItems" || videoSource === "community") {
        loadGalleryVideos();
      }
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const now = new Date();
  const minDate = format(now, "yyyy-MM-dd");
  const minTime = format(now, "HH:mm");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-green-600 dark:text-green-400 font-medium">{successMessage}</p>
            <p className="text-green-600 dark:text-green-400 text-sm mt-1">
              {t("youtubeCanContinue") || "You can continue uploading more videos or check your dashboard."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 ml-3"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Title */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {t("youtubeTitle")}
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="Enter video title"
        />
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {t("youtubeDescription")}
        </label>
        <textarea
          id="description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
          placeholder="Enter video description"
        />
      </div>

      {/* Video Source Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          {t("youtubeVideoSource")}
        </label>
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setVideoSource("upload")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              videoSource === "upload"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {t("youtubeUpload")}
          </button>
          <button
            type="button"
            onClick={() => setVideoSource("myItems")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              videoSource === "myItems"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {t("youtubeMyItems")}
          </button>
          <button
            type="button"
            onClick={() => setVideoSource("community")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              videoSource === "community"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {t("youtubeCommunity")}
          </button>
        </div>

        {/* Upload Section */}
        {videoSource === "upload" && (
          <div>
            <label
              htmlFor="video-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                  {uploadedFile ? t("youtubeSelected", { filename: uploadedFile.name }) : t("youtubeClickOrDrag")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("youtubeVideoFormats")}</p>
              </div>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {uploadedFile && (
              <div className="mt-3 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-blue-800 dark:text-blue-200">{uploadedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  {t("youtubeClear")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gallery Selection */}
        {(videoSource === "myItems" || videoSource === "community") && (
          <div>
            {loadingGallery ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t("youtubeLoadingGallery")}
              </div>
            ) : galleryVideos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-3">
                  {videoSource === "myItems" ? t("youtubeNoGalleryVideos") : t("youtubeNoPublicVideos")}
                </p>
                {videoSource === "myItems" && (
                  <Link
                    href={`${prefix}/toolbox`}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    {t("youtubeCreateOne")}
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {galleryVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedGalleryVideo(video.blobUrl)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedGalleryVideo === video.blobUrl
                        ? "border-blue-500 ring-2 ring-blue-500"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <video
                      src={video.blobUrl}
                      className="w-full h-32 object-cover"
                      muted
                    />
                    {selectedGalleryVideo === video.blobUrl && (
                      <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Video Preview */}
      {selectedGalleryVideo && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("youtubeSelectedVideo")}
            </label>
            <button
              type="button"
              onClick={() => setSelectedGalleryVideo(null)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              {t("remove")}
            </button>
          </div>
          <video
            src={selectedGalleryVideo}
            controls
            className="w-full rounded-lg max-h-64 border border-gray-200 dark:border-gray-700"
          />
        </div>
      )}

      {/* Visibility & Schedule Options */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-4">
          <label
            htmlFor="visibility"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {t("youtubeVisibility")}
          </label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "public" | "private" | "unlisted")}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="mb-4">
          <label
            htmlFor="account"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            YouTube Account
          </label>
          <select
            id="account"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {accounts.length === 0 && <option value="">{t("noAccount")}</option>}
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {(account.label || account.username || "Unnamed account") +
                  (account.isDefault ? " (Default)" : "")}
              </option>
            ))}
          </select>
        </div>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          {t("whenToPost")}
        </label>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="scheduleType"
              value="now"
              checked={scheduleType === "now"}
              onChange={() => setScheduleType("now")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-900 dark:text-white">{t("postImmediately")}</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="scheduleType"
              value="later"
              checked={scheduleType === "later"}
              onChange={() => setScheduleType("later")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-900 dark:text-white">{t("scheduleLater")}</span>
          </label>

          {scheduleType === "later" && (
            <div className="ml-7 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {t("date")}
                </label>
                <input
                  type="date"
                  id="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={minDate}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="time" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {t("time")}
                </label>
                <input
                  type="time"
                  id="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  min={scheduledDate === minDate ? minTime : undefined}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-stretch sm:justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? t("submitting") : scheduleType === "now" ? t("postNow") : t("schedulePost")}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                               */
/* ------------------------------------------------------------------ */

async function getYouTubeAccounts() {
  // This would fetch from your database
  // For now, return empty array - you'll need to implement this
  return [];
}

function YouTubeScheduleForm() {
  const [accounts, setAccounts] = useState<{ id: string; label: string | null; username: string | null; isDefault: boolean }[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch("/api/settings/youtube");
        if (res.ok) {
          const data = await res.json();
          const accts = data.youtubeAccounts || [];
          // Map YouTube accounts to match the expected format
          const mappedAccounts = accts.map((acc: { id: string; channelTitle: string | null; channelId: string | null; isDefault: boolean }) => ({
            id: acc.id,
            label: acc.channelTitle,
            username: acc.channelId,
            isDefault: acc.isDefault,
          }));
          setAccounts(mappedAccounts);
          const defaultAccount = mappedAccounts.find((a: { isDefault: boolean }) => a.isDefault);
          if (defaultAccount) {
            setSelectedAccountId(defaultAccount.id);
          } else if (mappedAccounts.length > 0) {
            setSelectedAccountId(mappedAccounts[0].id);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48 mb-6"></div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
      </div>
    );
  }

  return (
    <YouTubeUploadForm
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      setSelectedAccountId={setSelectedAccountId}
    />
  );
}

export default function YouTubeSchedulePage() {
  const t = useTranslations("schedule");
  const locale = useLocale();
  const prefix = locale === "zh" ? "/zh" : "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {t("title")} - YouTube
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <Link
                  href={`${prefix}/schedule/x`}
                  className="px-3 py-1.5 rounded-lg font-medium transition-colors text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  X
                </Link>
                <button
                  className="px-3 py-1.5 rounded-lg font-medium transition-colors text-sm bg-red-600 hover:bg-red-700 text-white"
                >
                  YouTube
                </button>
              </div>
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {t("cancel")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <Suspense
        fallback={
          <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48 mb-6"></div>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
            </div>
          </main>
        }
      >
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <YouTubeScheduleForm />
        </main>
      </Suspense>
    </div>
  );
}
